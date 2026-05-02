import { NextRequest, NextResponse } from "next/server"
import { questionnaire } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { withRls } from "@/lib/db/rls-context"
import { and, count, eq, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const conditions = isAdmin ? [] : [eq(questionnaire.ownerId, session.user.id)]

      const statusCounts = await tx
        .select({ status: questionnaire.status, count: count() })
        .from(questionnaire)
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(questionnaire.status)

      const statusMap: Record<string, number> = {}
      for (const row of statusCounts) {
        statusMap[row.status] = Number(row.count)
      }

      const typeCounts = await tx
        .select({ type: questionnaire.type, count: count() })
        .from(questionnaire)
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(questionnaire.type)

      const typeMap: Record<string, number> = {}
      for (const row of typeCounts) {
        typeMap[row.type] = Number(row.count)
      }

      const recent = await tx
        .select({
          id: questionnaire.id,
          title: questionnaire.title,
          type: questionnaire.type,
          status: questionnaire.status,
          updatedAt: questionnaire.updatedAt,
        })
        .from(questionnaire)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(sql`${questionnaire.updatedAt} desc`)
        .limit(5)

      return NextResponse.json({
        statusCounts: statusMap,
        typeCounts: typeMap,
        recent,
        total: statusCounts.reduce((sum, r) => sum + Number(r.count), 0),
      })
    }
  )
}
