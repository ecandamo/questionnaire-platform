import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionnaire } from "@/lib/db/schema"
import { and, count, eq, desc } from "drizzle-orm"
import { DashboardClient } from "./dashboard-client"
import type { QuestionnaireStatus, QuestionnaireType } from "@/types"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const isAdmin = session.user.role === "admin"
  const conditions = isAdmin ? [] : [eq(questionnaire.ownerId, session.user.id)]

  const statusRows = await db
    .select({ status: questionnaire.status, count: count() })
    .from(questionnaire)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(questionnaire.status)

  const typeRows = await db
    .select({ type: questionnaire.type, count: count() })
    .from(questionnaire)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(questionnaire.type)

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
    .orderBy(desc(questionnaire.updatedAt))
    .limit(8)

  const statusMap: Record<string, number> = {}
  for (const row of statusRows) statusMap[row.status] = Number(row.count)

  const typeMap: Record<string, number> = {}
  for (const row of typeRows) typeMap[row.type] = Number(row.count)

  const total = statusRows.reduce((s, r) => s + Number(r.count), 0)

  return (
    <DashboardClient
      userName={session.user.name}
      isAdmin={isAdmin}
      statusCounts={statusMap as Record<QuestionnaireStatus, number>}
      typeCounts={typeMap as Record<QuestionnaireType, number>}
      recent={recent}
      total={total}
    />
  )
}
