#!/usr/bin/env tsx
/**
 * backup-db.ts
 *
 * Creates a pre-RLS backup snapshot in two ways:
 *   1. Neon branch  — uses the Neon REST API to copy the current branch data
 *   2. pg_dump file — runs pg_dump locally if the tool is available
 *
 * Usage:
 *   npm run db:backup
 *
 * Required env vars (from .env.local):
 *   DATABASE_URL   — standard Neon connection string (already set for db:push)
 *   NEON_API_KEY   — Neon account API key  (get from https://console.neon.tech/app/settings/api-keys)
 *   NEON_PROJECT_ID — your project's short id  (visible in Neon console URL or project settings)
 *
 * Optional:
 *   BACKUP_BRANCH_NAME — Neon branch name (default: backup-pre-rls-<UTC YYYY-MM-DD-HH-mm-ss>, unique per run)
 *
 * Only DATABASE_URL is mandatory; pg_dump and Neon branch steps are skipped
 * gracefully when the respective env vars / tools are absent.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs"
import { execSync, spawnSync } from "node:child_process"
import { resolve } from "node:path"

// ── Load env vars from .env.local / .env ─────────────────────────────────────

function readEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      let v = m[2]!.trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

readEnvFiles()

const DATABASE_URL = process.env.DATABASE_URL
const NEON_API_KEY = process.env.NEON_API_KEY
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID

if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Add it to .env.local.")
  process.exit(1)
}

/** One backup tag per run — date-only names collide on Neon (409 BRANCH_ALREADY_EXISTS). */
function backupTag(): string {
  const raw =
    process.env.BACKUP_BRANCH_NAME?.trim() ||
    `backup-pre-rls-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-")
}

const tag = backupTag()

// ── 1. Neon branch snapshot ───────────────────────────────────────────────────

async function createNeonBranch() {
  if (!NEON_API_KEY || !NEON_PROJECT_ID) {
    console.log(
      "⚠️  Skipping Neon branch backup — NEON_API_KEY and NEON_PROJECT_ID not set.\n" +
        "    Set them in .env.local or export them to create an instant branch snapshot."
    )
    return
  }

  console.log(`\n▶  Creating Neon branch: ${tag} …`)

  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NEON_API_KEY}`,
      },
      body: JSON.stringify({ branch: { name: tag } }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    const duplicateBranch =
      res.status === 409 &&
      (text.includes("BRANCH_ALREADY_EXISTS") || text.includes("branch already exists"))
    if (duplicateBranch) {
      console.log(
        `⚠️  Branch name already exists: ${tag}\n` +
          "    Either delete that branch in the Neon console (Branches), or re-run with a new name, e.g.:\n" +
          `    BACKUP_BRANCH_NAME=${tag}-retry npm run db:backup`
      )
      return
    }
    console.error(`❌  Neon API error ${res.status}: ${text}`)
    return
  }

  const data = (await res.json()) as { branch: { id: string; name: string } }
  console.log(`✅  Neon branch created: ${data.branch.name} (id: ${data.branch.id})`)
  console.log(
    "    To restore: point DATABASE_URL at this branch's connection string in the Neon console."
  )
}

// ── 2. pg_dump logical backup ─────────────────────────────────────────────────

function pgDump() {
  const pgDumpBin =
    spawnSync("which", ["pg_dump"], { encoding: "utf8" }).stdout.trim() ||
    spawnSync("which", ["pg_dump16"], { encoding: "utf8" }).stdout.trim() ||
    "/usr/local/bin/pg_dump"

  if (!existsSync(pgDumpBin)) {
    console.log(
      "\n⚠️  pg_dump not found — skipping logical dump.\n" +
        "    Install PostgreSQL client tools (e.g. brew install libpq) and re-run,\n" +
        "    or use the Neon branch snapshot above as your restore point."
    )
    return
  }

  // Use direct (non-pooler) URL for consistent dumps
  const directUrl = DATABASE_URL!.replace("-pooler.", ".")
  const outFile = `${tag}.dump`

  console.log(`\n▶  Running pg_dump → ${outFile} …`)

  try {
    execSync(`"${pgDumpBin}" "${directUrl}" -Fc -f "${outFile}"`, {
      stdio: "inherit",
    })
    console.log(`✅  Dump written: ${outFile}`)
    console.log(
      "    To restore: pg_restore --clean -d <connection_string> " + outFile
    )

    // Write a small README alongside the dump
    writeFileSync(
      `${tag}-restore.md`,
      `# Restore instructions for ${outFile}\n\n` +
        "```bash\n" +
        `pg_restore --clean --if-exists -d "$DATABASE_URL" ${outFile}\n` +
        "```\n\n" +
        "Or restore into a new Neon branch and swap DATABASE_URL.\n"
    )
  } catch (e) {
    console.error("❌  pg_dump failed:", e instanceof Error ? e.message : e)
  }
}

// ── Run (no top-level await — tsx/esbuild CJS output does not support it) ─────

void (async function main() {
  console.log("=== Database backup — pre-RLS ===")
  console.log(`Tag: ${tag}`)

  await createNeonBranch()
  pgDump()

  console.log(
    "\nDone. Do NOT proceed with RLS migrations until you have confirmed a restore path."
  )
})().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
