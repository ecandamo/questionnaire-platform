import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaire, questionnaireQuestion, client, user } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { asc, eq } from "drizzle-orm"

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getRequestSession>>>, ownerId: string) {
  return session.user.role === "admin" || session.user.id === ownerId
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [q] = await db
    .select({
      id: questionnaire.id,
      title: questionnaire.title,
      type: questionnaire.type,
      status: questionnaire.status,
      clientId: questionnaire.clientId,
      clientName: client.name,
      ownerId: questionnaire.ownerId,
      ownerName: user.name,
      templateId: questionnaire.templateId,
      publishedAt: questionnaire.publishedAt,
      submittedAt: questionnaire.submittedAt,
      createdAt: questionnaire.createdAt,
      updatedAt: questionnaire.updatedAt,
    })
    .from(questionnaire)
    .leftJoin(client, eq(questionnaire.clientId, client.id))
    .leftJoin(user, eq(questionnaire.ownerId, user.id))
    .where(eq(questionnaire.id, id))

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccess(session, q.ownerId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const questions = await db
    .select()
    .from(questionnaireQuestion)
    .where(eq(questionnaireQuestion.questionnaireId, id))
    .orderBy(asc(questionnaireQuestion.sortOrder))

  return NextResponse.json({ ...q, questions })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { questions: questionUpdates, ...questionnaireData } = body

  const [existing] = await db
    .select()
    .from(questionnaire)
    .where(eq(questionnaire.id, id))

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccess(session, existing.ownerId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Published questionnaires cannot be edited" }, { status: 400 })
  }

  const [updated] = await db
    .update(questionnaire)
    .set({ ...questionnaireData, updatedAt: new Date() })
    .where(eq(questionnaire.id, id))
    .returning()

  // Replace all questions if provided
  if (questionUpdates !== undefined) {
    await db.delete(questionnaireQuestion).where(eq(questionnaireQuestion.questionnaireId, id))
    if (questionUpdates.length > 0) {
      await db.insert(questionnaireQuestion).values(
        questionUpdates.map((q: Record<string, unknown>, i: number) => ({
          ...q,
          questionnaireId: id,
          sortOrder: i,
        }))
      )
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "update",
    entityType: "questionnaire",
    entityId: id,
    metadata: questionnaireData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const permanent = req.nextUrl.searchParams.get("permanent") === "true"

  const [existing] = await db.select().from(questionnaire).where(eq(questionnaire.id, id))

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccess(session, existing.ownerId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (permanent) {
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await db.delete(questionnaire).where(eq(questionnaire.id, id))
    await logAudit({
      userId: session.user.id,
      action: "delete",
      entityType: "questionnaire",
      entityId: id,
    })
  } else {
    await db
      .update(questionnaire)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(questionnaire.id, id))
    await logAudit({
      userId: session.user.id,
      action: "archive",
      entityType: "questionnaire",
      entityId: id,
    })
  }

  return NextResponse.json({ success: true })
}
