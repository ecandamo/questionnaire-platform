import { NextRequest, NextResponse } from "next/server"
import {
  question,
  questionCategory,
  questionnaireCategory,
  questionnaireTemplate,
  templateQuestion,
} from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { and, asc, eq, ilike, inArray } from "drizzle-orm"
import type { QuestionType } from "@/types"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const categoryId = searchParams.get("categoryId")
  const type = searchParams.get("type")
  const status = searchParams.get("status") ?? "active"
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const conditions = []
      if (status && status !== "all") {
        conditions.push(eq(question.status, status as "active" | "inactive" | "archived"))
      }
      if (categoryId) conditions.push(eq(question.categoryId, categoryId))
      if (type) conditions.push(eq(question.type, type as QuestionType))
      if (search) conditions.push(ilike(question.text, `%${search}%`))

      const questions = await tx
        .select({
          id: question.id,
          categoryId: question.categoryId,
          categoryName: questionCategory.name,
          text: question.text,
          description: question.description,
          type: question.type,
          options: question.options,
          isRequired: question.isRequired,
          sortOrder: question.sortOrder,
          status: question.status,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
        })
        .from(question)
        .leftJoin(questionCategory, eq(question.categoryId, questionCategory.id))
        .where(and(...conditions))
        .orderBy(asc(question.sortOrder), asc(question.text))

      const questionIds = questions.map((q) => q.id)
      const templatesByQuestionId = new Map<
        string,
        { id: string; name: string; type: string; color: string | null }[]
      >()

      if (questionIds.length > 0) {
        const links = await tx
          .select({
            questionId: templateQuestion.questionId,
            templateId: questionnaireTemplate.id,
            templateName: questionnaireTemplate.name,
            templateType: questionnaireTemplate.type,
            templateColor: questionnaireCategory.color,
          })
          .from(templateQuestion)
          .innerJoin(
            questionnaireTemplate,
            eq(templateQuestion.templateId, questionnaireTemplate.id)
          )
          .leftJoin(
            questionnaireCategory,
            eq(questionnaireTemplate.type, questionnaireCategory.slug)
          )
          .where(inArray(templateQuestion.questionId, questionIds))

        for (const row of links) {
          const list = templatesByQuestionId.get(row.questionId) ?? []
          if (!list.some((t) => t.id === row.templateId)) {
            list.push({
              id: row.templateId,
              name: row.templateName,
              type: row.templateType,
              color: row.templateColor,
            })
          }
          templatesByQuestionId.set(row.questionId, list)
        }
      }

      const withTemplates = questions.map((q) => ({
        ...q,
        templates: (templatesByQuestionId.get(q.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }))

      return NextResponse.json(withTemplates)
    }
  )
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { text, description, type, options, isRequired, categoryId, sortOrder } = body

  if (!text || !type) {
    return NextResponse.json({ error: "Text and type are required" }, { status: 400 })
  }

  return withRls(
    { mode: "auth", userId: session!.user.id, isAdmin: true },
    async (tx) => {
      const [created] = await tx
        .insert(question)
        .values({
          text,
          description,
          type,
          options: options ?? null,
          isRequired: isRequired ?? false,
          categoryId: categoryId ?? null,
          sortOrder: sortOrder ?? 0,
          createdBy: session!.user.id,
        })
        .returning()

      await logAudit(
        {
          userId: session!.user.id,
          action: "create",
          entityType: "question",
          entityId: created.id,
          metadata: { text, type },
        },
        tx
      )

      return NextResponse.json(created, { status: 201 })
    }
  )
}
