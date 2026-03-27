import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaire } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { and, count, eq, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "admin"

  // Status counts
  const conditions = isAdmin
    ? []
    : [eq(questionnaire.ownerId, session.user.id)]

  const statusCounts = await db
    .select({
      status: questionnaire.status,
      count: count(),
    })
    .from(questionnaire)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(questionnaire.status)

  const statusMap: Record<string, number> = {}
  for (const row of statusCounts) {
    statusMap[row.status] = Number(row.count)
  }

  // Type counts
  const typeCounts = await db
    .select({
      type: questionnaire.type,
      count: count(),
    })
    .from(questionnaire)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(questionnaire.type)

  const typeMap: Record<string, number> = {}
  for (const row of typeCounts) {
    typeMap[row.type] = Number(row.count)
  }

  // Recent (last 5)
  const recent = await db
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
