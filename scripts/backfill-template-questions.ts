#!/usr/bin/env tsx
/**
 * Backfill blank questionnaire questions created by the template-copy bug.
 *
 * Background:
 *   POST /api/questionnaires copied template questions into `questionnaire_question`,
 *   but fetched the source bank rows with `and(id = a, id = b, …)` — always false for
 *   2+ questions — so `sourceQ` was undefined and every copied row fell back to the
 *   defaults: text = '' , description = NULL, type = 'short_text', options = NULL.
 *   (Fixed in the route by switching to `inArray(question.id, questionIds)`.)
 *
 * This script repairs rows already persisted with that empty-text signature by
 * restoring text/description/type/options from the linked bank question
 * (`source_question_id`).
 *
 * Safety:
 *   - Only touches rows where text = '' AND is_custom = false AND source_question_id
 *     matches an existing bank question. Legitimate (non-blank) rows and user-edited
 *     rows are never modified.
 *   - Runs inside a single transaction using the admin RLS context (app.rls_mode='auth',
 *     app.is_admin='true'), the same mechanism the app uses. Dry-run rolls back.
 *
 * Usage:
 *   npx tsx scripts/backfill-template-questions.ts          # dry-run: report only
 *   npx tsx scripts/backfill-template-questions.ts --apply  # write the fix
 *
 * Requires DATABASE_URL (read from env or .env.local / .env), same as db:migrate.
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { Pool } from "pg"

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

// Rows created by the bug: empty text, copied from the bank (not custom).
const AFFECTED_FILTER = `qq.text = '' AND qq.is_custom = false`

void (async function main() {
  const apply = process.argv.includes("--apply")

  loadDatabaseUrlFromEnvFiles()
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error("DATABASE_URL is missing. Set it or add it to .env.local / .env.")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    // Admin RLS context so we can read the bank and write across all owners' rows.
    await client.query("SELECT set_config('app.rls_mode', 'auth', true)")
    await client.query("SELECT set_config('app.is_admin', 'true', true)")
    await client.query("SELECT set_config('app.user_id', 'backfill-script', true)")

    // How many blank rows exist overall, and how many are recoverable (source still present)?
    const totals = await client.query(`
      SELECT
        COUNT(*)::int AS blank_total,
        COUNT(*) FILTER (WHERE q.id IS NOT NULL)::int AS recoverable,
        COUNT(*) FILTER (WHERE qq.source_question_id IS NULL)::int AS no_source,
        COUNT(*) FILTER (WHERE qq.source_question_id IS NOT NULL AND q.id IS NULL)::int AS source_deleted
      FROM questionnaire_question qq
      LEFT JOIN question q ON q.id = qq.source_question_id
      WHERE ${AFFECTED_FILTER}
    `)
    const t = totals.rows[0]

    console.log(`Blank template-copied rows found: ${t.blank_total}`)
    console.log(`  recoverable (source bank question exists): ${t.recoverable}`)
    console.log(`  unrecoverable — no source_question_id:      ${t.no_source}`)
    console.log(`  unrecoverable — source question deleted:    ${t.source_deleted}`)

    if (t.recoverable > 0) {
      const preview = await client.query(`
        SELECT qq.questionnaire_id, qq.id AS qq_id, q.text AS restored_text, q.type AS restored_type
        FROM questionnaire_question qq
        JOIN question q ON q.id = qq.source_question_id
        WHERE ${AFFECTED_FILTER}
        ORDER BY qq.questionnaire_id, qq.sort_order
        LIMIT 20
      `)
      console.log(`\nPreview (up to 20 of ${t.recoverable}):`)
      for (const r of preview.rows) {
        console.log(
          `  q'naire ${String(r.questionnaire_id).slice(0, 8)}…  row ${String(r.qq_id).slice(0, 8)}…  → "${r.restored_text}" [${r.restored_type}]`,
        )
      }
    }

    if (!apply) {
      await client.query("ROLLBACK")
      console.log("\nDry run. No changes written. Re-run with --apply to fix.\n")
      process.exit(0)
    }

    const res = await client.query(`
      UPDATE questionnaire_question qq
      SET text = q.text,
          description = q.description,
          type = q.type,
          options = q.options
      FROM question q
      WHERE qq.source_question_id = q.id
        AND ${AFFECTED_FILTER}
    `)
    await client.query("COMMIT")
    console.log(`\nRepaired ${res.rowCount} row(s).`)
    if (t.no_source > 0 || t.source_deleted > 0) {
      console.log(
        `${t.no_source + t.source_deleted} blank row(s) could not be recovered (no linked bank question) — recreate those questionnaires or edit them manually.`,
      )
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("Backfill failed, rolled back:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
})()
