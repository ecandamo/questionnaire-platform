#!/usr/bin/env tsx
/**
 * Mark historical migrations as applied without running their SQL.
 *
 * Use when the database schema already matches migrations 0000–000N (e.g. built with
 * `db:push`) but `drizzle.__drizzle_migrations` is empty — `migrate()` would fail on
 * "already exists" for the first file.
 *
 * Inserts one row per migration (hash + created_at) for all journal entries **except
 * the last** (by default: all but `0006_rls_policies`), so the next `npm run db:migrate`
 * only runs the final pending file(s).
 *
 * Usage:
 *   npx tsx scripts/baseline-migrations.ts          # dry-run: print what would be inserted
 *   npx tsx scripts/baseline-migrations.ts --apply  # write to the database
 *
 * Requires direct DATABASE_URL (same as `db:migrate:verbose`).
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { Pool } from "pg"
import { readMigrationFiles } from "drizzle-orm/migrator"

function loadDatabaseUrlFromEnvFiles(): void {
  if (process.env.DATABASE_URL?.trim()) return
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const m = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/)
      if (!m) continue
      let v = m[1]!.trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      process.env.DATABASE_URL = v
      return
    }
  }
}

void (async function main() {
  const apply = process.argv.includes("--apply")

  loadDatabaseUrlFromEnvFiles()
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error("DATABASE_URL is missing. Set it or add it to .env.local / .env.")
    process.exit(1)
  }

  const migrationsFolder = resolve(process.cwd(), "drizzle")
  const all = readMigrationFiles({ migrationsFolder })
  if (all.length < 2) {
    console.error("Expected at least 2 migrations in the journal.")
    process.exit(1)
  }

  const baseline = all.slice(0, -1)
  const pending = all.at(-1)!

  console.log(
    `Baselining ${baseline.length} migration(s); pending after baseline: 1 file (hash prefix ${pending.hash.slice(0, 8)}…).`,
  )

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to insert into drizzle.__drizzle_migrations.\n")
    for (const m of baseline) {
      console.log(`  created_at=${m.folderMillis}  hash=${m.hash}`)
    }
    process.exit(0)
  }

  const pool = new Pool({ connectionString: url })
  const client = await pool.connect()
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`)
    await client.query(`
			CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`)

    let inserted = 0
    for (const m of baseline) {
      const r = await client.query(
        `
        INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
        SELECT $1::text, $2::bigint
        WHERE NOT EXISTS (
          SELECT 1 FROM drizzle.__drizzle_migrations x WHERE x.hash = $1::text
        )
        `,
        [m.hash, String(m.folderMillis)],
      )
      inserted += r.rowCount ?? 0
    }

    console.log(`Inserted ${inserted} row(s) (${baseline.length - inserted} already present).`)
    console.log("Next: npm run db:migrate   or   npm run db:migrate:verbose")
  } finally {
    client.release()
    await pool.end()
  }
})()
