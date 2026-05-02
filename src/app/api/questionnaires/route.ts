import { NextRequest, NextResponse } from "next/server"
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
import { withRls } from "@/lib/db/rls-context"
import { and, asc, desc, eq } from "drizzle-orm"
import type { QuestionnaireStatus, QuestionnaireType } from "@/types"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const status = searchParams.get("status") as QuestionnaireStatus | null
  const type = searchParams.get("type") as QuestionnaireType | null
  const clientId = searchParams.get("clientId")
  const ownerId = searchParams.get("ownerId")
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const conditions = []
      if (!isAdmin) {
        conditions.push(eq(questionnaire.ownerId, session.user.id))
      } else if (ownerId) {
        conditions.push(eq(questionnaire.ownerId, ownerId))
      }
      if (status) conditions.push(eq(questionnaire.status, status))
      if (type) conditions.push(eq(questionnaire.type, type))
      if (clientId) conditions.push(eq(questionnaire.clientId, clientId))

      const results = await tx
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

      const filtered = search
        ? results.filter(
            (r) =>
              r.title.toLowerCase().includes(search.toLowerCase()) ||
              (r.clientName ?? "").toLowerCase().includes(search.toLowerCase())
          )
        : results

      return NextResponse.json(filtered)
    }
  )
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, type, clientId, templateId } = body

  if (!title || !type) {
    return NextResponse.json({ error: "Title and type are required" }, { status: 400 })
  }

  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx
        .insert(questionnaire)
        .values({
          title,
          type,
          clientId: clientId ?? null,
          templateId: templateId ?? null,
          ownerId: session.user.id,
          status: "draft",
        })
        .returning()

      // If a template is specified, copy its questions
      if (templateId) {
        const templateQs = await tx
          .select({ questionId: templateQuestion.questionId, sortOrder: templateQuestion.sortOrder, isRequired: templateQuestion.isRequired })
          .from(templateQuestion)
          .where(eq(templateQuestion.templateId, templateId))
          .orderBy(asc(templateQuestion.sortOrder))

        if (templateQs.length > 0) {
          const questionIds = templateQs.map((tq) => tq.questionId)
          const questions = await tx
            .select()
            .from(question)
            .where(
              questionIds.length === 1
                ? eq(question.id, questionIds[0])
                : and(...questionIds.map((id) => eq(question.id, id)))
            )

          const questionMap = new Map(questions.map((q) => [q.id, q]))

          await tx.insert(questionnaireQuestion).values(
            templateQs.map((tq, i) => {
              const sourceQ = questionMap.get(tq.questionId)
              return {
                questionnaireId: q.id,
                sourceQuestionId: tq.questionId,
                text: sourceQ?.text ?? "",
                description: sourceQ?.description ?? null,
                type: sourceQ?.type ?? "short_text",
                options: sourceQ?.options ?? null,
                isRequired: tq.isRequired,
                isHidden: false,
                sortOrder: i,
                isCustom: false,
              }
            })
          )
        }
      }

      await logAudit(
        {
          userId: session.user.id,
          action: "create",
          entityType: "questionnaire",
          entityId: q.id,
          metadata: { title, type },
        },
        tx
      )

      return NextResponse.json(q, { status: 201 })
    }
  )
}
