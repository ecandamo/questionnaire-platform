#!/usr/bin/env tsx
/**
 * Runs Drizzle migrations via `pg` + `migrate()` and prints the full error.
 * `drizzle-kit migrate` sometimes exits 1 without surfacing the underlying SQL error.
 *
 * Usage:
 *   npm run db:migrate:verbose
 *
 * Use a direct (non-pooler) DATABASE_URL. Optional: `export DATABASE_URL=...` for a one-off.
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"

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
  loadDatabaseUrlFromEnvFiles()
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error("DATABASE_URL is missing. Set it or add it to .env.local / .env.")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool)
  const migrationsFolder = resolve(process.cwd(), "drizzle")

  try {
    console.log("Running migrations from", migrationsFolder)
    await migrate(db, { migrationsFolder })
    console.log("Migrations finished successfully.")
  } catch (err) {
    console.error("Migration failed:")
    if (err instanceof Error) {
      console.error(err.message)
      if (err.stack) console.error(err.stack)
    } else {
      console.error(err)
    }
    process.exitCode = 1
  } finally {
    await pool.end().catch(() => {})
  }
})()
