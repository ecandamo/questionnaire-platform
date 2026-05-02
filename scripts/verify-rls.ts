#!/usr/bin/env tsx
/**
 * verify-rls.ts
 *
 * Sanity check that RLS is enabled + forced on all expected app tables,
 * and that policies have been created. Exits non-zero if anything is missing.
 *
 * Usage:
 *   npm run db:verify-rls
 *
 * Runs against DATABASE_URL from .env.local / .env.
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

function readEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m) continue
      let v = m[2]!.trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

// Tables that MUST have RLS enabled + forced
const EXPECTED_RLS_TABLES = [
  "questionnaire",
  "questionnaire_question",
  "client",
  "share_link",
  "response",
  "response_collaborator",
  "question_assignment",
  "answer",
  "question",
  "question_category",
  "questionnaire_template",
  "template_question",
  "questionnaire_category",
  "audit_log",
]

// Tables that MUST NOT have RLS (Better Auth)
const EXCLUDED_TABLES = ["user", "session", "account", "verification"]

readEnv()

void (async function main() {
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set")
    process.exit(1)
  }

  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(DATABASE_URL)

  console.log("=== RLS verification ===\n")

  // Check pg_class for relrowsecurity + relforcerowsecurity
  const rows = (await sql`
  SELECT
    relname,
    relrowsecurity   AS rls_enabled,
    relforcerowsecurity AS rls_forced
  FROM pg_class
  WHERE relkind = 'r'
    AND relname = ANY(${[...EXPECTED_RLS_TABLES, ...EXCLUDED_TABLES]})
  ORDER BY relname
`) as { relname: string; rls_enabled: boolean; rls_forced: boolean }[]

  const tableMap = new Map(rows.map((r) => [r.relname, r]))

  let fail = false

  console.log("── Tables expecting RLS enabled + forced:")
  for (const t of EXPECTED_RLS_TABLES) {
    const row = tableMap.get(t)
    if (!row) {
      console.log(`  ❌  ${t} — table not found`)
      fail = true
      continue
    }
    const ok = row.rls_enabled && row.rls_forced
    console.log(
      `  ${ok ? "✅" : "❌"}  ${t} — enabled=${row.rls_enabled} forced=${row.rls_forced}`,
    )
    if (!ok) fail = true
  }

  console.log("\n── Tables expecting NO RLS (Better Auth):")
  for (const t of EXCLUDED_TABLES) {
    const row = tableMap.get(t)
    if (!row) {
      console.log(`  ⚠️   ${t} — table not found (may not exist yet)`)
      continue
    }
    const ok = !row.rls_enabled
    console.log(
      `  ${ok ? "✅" : "⚠️ "}  ${t} — rls_enabled=${row.rls_enabled} (should be false)`,
    )
  }

  // Count policies
  const policyRows = (await sql`
  SELECT schemaname, tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE tablename = ANY(${EXPECTED_RLS_TABLES})
  GROUP BY schemaname, tablename
  ORDER BY tablename
`) as { tablename: string; policy_count: string }[]

  const policyMap = new Map(policyRows.map((r) => [r.tablename, Number(r.policy_count)]))

  console.log("\n── Policy counts per table:")
  for (const t of EXPECTED_RLS_TABLES) {
    const count = policyMap.get(t) ?? 0
    const ok = count > 0
    console.log(`  ${ok ? "✅" : "❌"}  ${t} — ${count} polic${count === 1 ? "y" : "ies"}`)
    if (!ok) fail = true
  }

  console.log()
  if (fail) {
    console.error("❌  RLS verification FAILED — run npm run db:migrate and retry")
    process.exit(1)
  } else {
    console.log("✅  RLS verification passed")
  }
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
