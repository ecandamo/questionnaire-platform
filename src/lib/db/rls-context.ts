/**
 * rls-context.ts
 *
 * Row Level Security helpers for this project.
 *
 * Background — why transactions are required:
 *   This project uses `drizzle-orm/neon-serverless` (WebSocket pool). Each
 *   standalone `db.select()` may run on a different connection from the pool,
 *   so a plain `SET app.user_id = …` would not persist across calls.
 *   `SET LOCAL` scopes the GUC to the current transaction only, which is the
 *   safe pattern for serverless: it guarantees the setting is visible to every
 *   query in the same tx and is automatically discarded when the tx ends.
 *
 * Usage:
 *   import { withRls } from "@/lib/db/rls-context"
 *
 *   // Authenticated route
 *   return withRls({ mode: "auth", userId: session.user.id, isAdmin: session.user.role === "admin" }, async (tx) => {
 *     const rows = await tx.select().from(questionnaire)
 *     return NextResponse.json(rows)
 *   })
 *
 *   // Public share link route
 *   return withRls({ mode: "share_owner", shareToken: token }, async (tx) => { … })
 *
 *   // Public contributor token route
 *   return withRls({ mode: "share_contributor", collaboratorToken: token }, async (tx) => { … })
 */

import { sql } from "drizzle-orm"
import { db } from "./index"
import type { NeonDatabase } from "drizzle-orm/neon-serverless"
import type * as schema from "./schema"

export type Tx = NeonDatabase<typeof schema>

export type RlsContext =
  | { mode: "auth"; userId: string; isAdmin: boolean }
  | { mode: "share_owner"; shareToken: string }
  | { mode: "share_contributor"; collaboratorToken: string }

/**
 * Sets GUCs via SET LOCAL inside an active transaction.
 * Must be called as the first thing inside a db.transaction() callback.
 */
export async function setLocalRls(tx: Tx, ctx: RlsContext): Promise<void> {
  if (ctx.mode === "auth") {
    await tx.execute(sql`SELECT set_config('app.rls_mode', 'auth', true)`)
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`)
    await tx.execute(
      sql`SELECT set_config('app.is_admin', ${ctx.isAdmin ? "true" : "false"}, true)`
    )
  } else if (ctx.mode === "share_owner") {
    await tx.execute(sql`SELECT set_config('app.rls_mode', 'share_owner', true)`)
    await tx.execute(sql`SELECT set_config('app.share_token', ${ctx.shareToken}, true)`)
  } else if (ctx.mode === "share_contributor") {
    await tx.execute(
      sql`SELECT set_config('app.rls_mode', 'share_contributor', true)`
    )
    await tx.execute(
      sql`SELECT set_config('app.collaborator_token', ${ctx.collaboratorToken}, true)`
    )
  }
}

/**
 * Runs `fn` inside a Drizzle transaction with RLS context already set.
 * All DB calls inside `fn` must use the `tx` parameter, not the global `db`.
 */
export async function withRls<T>(ctx: RlsContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await setLocalRls(tx, ctx)
    return fn(tx)
  })
}
