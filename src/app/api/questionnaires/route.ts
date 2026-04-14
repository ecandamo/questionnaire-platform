import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  questionnaire,
  questionnaireQuestion,
  templateQuestion,
  question,
  client,
  user,
} from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { and, asc, desc, eq } from "drizzle-orm"
import type { QuestionnaireStatus, QuestionnaireType } from "@/types"

function requireAuth(session: Awaited<ReturnType<typeof getRequestSession>>) {
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const status = searchParams.get("status") as QuestionnaireStatus | null
  const type = searchParams.get("type") as QuestionnaireType | null
  const clientId = searchParams.get("clientId")
  const ownerId = searchParams.get("ownerId")

  const isAdmin = session!.user.role === "admin"

  const conditions = []

  // Non-admins can only see their own questionnaires
  if (!isAdmin) {
    conditions.push(eq(questionnaire.ownerId, session!.user.id))
  } else if (ownerId) {
    conditions.push(eq(questionnaire.ownerId, ownerId))
  }

  if (status) conditions.push(eq(questionnaire.status, status))
  if (type) conditions.push(eq(questionnaire.type, type))
  if (clientId) conditions.push(eq(questionnaire.clientId, clientId))

  const results = await db
    .select({
      id: questionnaire.id,
      title: questionnaire.title,
      type: questionnaire.type,
      status: questionnaire.status,
      clientId: questionnaire.clientId,
      clientName: client.name,
      ownerId: questionnaire.ownerId,
      ownerName: user.name,
      publishedAt: questionnaire.publishedAt,
      submittedAt: questionnaire.submittedAt,
      createdAt: questionnaire.createdAt,
      updatedAt: questionnaire.updatedAt,
    })
    .from(questionnaire)
    .leftJoin(client, eq(questionnaire.clientId, client.id))
    .leftJoin(user, eq(questionnaire.ownerId, user.id))
    .where(and(...conditions))
    .orderBy(desc(questionnaire.updatedAt))

  // Apply search after join (search on title or client name)
  const filtered = search
    ? results.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          (r.clientName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : results

  return NextResponse.json(filtered)
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const body = await req.json()
  const { title, type, clientId, templateId } = body

  if (!title || !type) {
    return NextResponse.json({ error: "Title and type are required" }, { status: 400 })
  }

  // Create the questionnaire
  const [q] = await db
    .insert(questionnaire)
    .values({
      title,
      type,
      clientId: clientId ?? null,
      templateId: templateId ?? null,
      ownerId: session!.user.id,
      status: "draft",
    })
    .returning()

  // If a template is selected, copy its questions as a snapshot
  if (templateId) {
    const tqs = await db
      .select({
        questionId: templateQuestion.questionId,
        sortOrder: templateQuestion.sortOrder,
        isRequired: templateQuestion.isRequired,
        text: question.text,
        description: question.description,
        type: question.type,
        options: question.options,
      })
      .from(templateQuestion)
      .innerJoin(question, eq(templateQuestion.questionId, question.id))
      .where(eq(templateQuestion.templateId, templateId))
      .orderBy(asc(templateQuestion.sortOrder))

    if (tqs.length > 0) {
      await db.insert(questionnaireQuestion).values(
        tqs.map((tq) => ({
          questionnaireId: q.id,
          sourceQuestionId: tq.questionId,
          text: tq.text,
          description: tq.description ?? null,
          type: tq.type,
          options: tq.options ?? null,
          isRequired: tq.isRequired,
          sortOrder: tq.sortOrder,
          isCustom: false,
        }))
      )
    }
  }

  await logAudit({
    userId: session!.user.id,
    action: "create",
    entityType: "questionnaire",
    entityId: q.id,
    metadata: { title, type },
  })

  return NextResponse.json(q, { status: 201 })
}
