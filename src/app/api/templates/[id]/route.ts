import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaireTemplate, templateQuestion, question, questionCategory } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { asc, eq } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [template] = await db
    .select()
    .from(questionnaireTemplate)
    .where(eq(questionnaireTemplate.id, id))

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const questions = await db
    .select({
      id: templateQuestion.id,
      questionId: templateQuestion.questionId,
      sortOrder: templateQuestion.sortOrder,
      isRequired: templateQuestion.isRequired,
      text: question.text,
      type: question.type,
      options: question.options,
      description: question.description,
      categoryName: questionCategory.name,
    })
    .from(templateQuestion)
    .innerJoin(question, eq(templateQuestion.questionId, question.id))
    .leftJoin(questionCategory, eq(question.categoryId, questionCategory.id))
    .where(eq(templateQuestion.templateId, id))
    .orderBy(asc(templateQuestion.sortOrder))

  return NextResponse.json({ ...template, questions })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const { id } = await params
  const body = await req.json()
  const { questions: questionUpdates, ...templateData } = body

  const [updated] = await db
    .update(questionnaireTemplate)
    .set({ ...templateData, updatedAt: new Date() })
    .where(eq(questionnaireTemplate.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (questionUpdates !== undefined) {
    await db.delete(templateQuestion).where(eq(templateQuestion.templateId, id))
    if (questionUpdates.length > 0) {
      await db.insert(templateQuestion).values(
        questionUpdates.map((q: { questionId: string; isRequired?: boolean }, i: number) => ({
          templateId: id,
          questionId: q.questionId,
          sortOrder: i,
          isRequired: q.isRequired ?? false,
        }))
      )
    }
  }

  await logAudit({
    userId: session!.user.id,
    action: "update",
    entityType: "template",
    entityId: id,
    metadata: templateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const { id } = await params
  const permanent = req.nextUrl.searchParams.get("permanent") === "true"

  const [existing] = await db
    .select()
    .from(questionnaireTemplate)
    .where(eq(questionnaireTemplate.id, id))

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (permanent) {
    await db.delete(questionnaireTemplate).where(eq(questionnaireTemplate.id, id))

    await logAudit({
      userId: session!.user.id,
      action: "delete",
      entityType: "template",
      entityId: id,
    })
  } else {
    await db
      .update(questionnaireTemplate)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(questionnaireTemplate.id, id))

    await logAudit({
      userId: session!.user.id,
      action: "deactivate",
      entityType: "template",
      entityId: id,
    })
  }

  return NextResponse.json({ success: true })
}
