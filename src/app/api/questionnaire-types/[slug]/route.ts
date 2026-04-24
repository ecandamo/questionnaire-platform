import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaireCategory, questionnaire, questionnaireTemplate } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { QUESTIONNAIRE_TYPE_COLOR_OPTIONS } from "@/lib/questionnaire-type-colors"
import { eq, count } from "drizzle-orm"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const { slug } = await params

  const [existing] = await db
    .select()
    .from(questionnaireCategory)
    .where(eq(questionnaireCategory.slug, slug))

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const { label, color, isActive, sortOrder } = body as {
    label?: string
    color?: string
    isActive?: boolean
    sortOrder?: number
  }

  const updates: Partial<typeof questionnaireCategory.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (label !== undefined) {
    if (!label.trim()) {
      return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 })
    }
    updates.label = label.trim()
  }
  if (color !== undefined) {
    const allowedColors = new Set(QUESTIONNAIRE_TYPE_COLOR_OPTIONS.map((option) => option.value))
    if (!allowedColors.has(color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 })
    }
    updates.color = color
  }
  if (isActive !== undefined) updates.isActive = isActive
  if (sortOrder !== undefined) updates.sortOrder = sortOrder

  const [updated] = await db
    .update(questionnaireCategory)
    .set(updates)
    .where(eq(questionnaireCategory.slug, slug))
    .returning()

  await logAudit({
    userId: session!.user.id,
    action: "update",
    entityType: "questionnaire_category",
    entityId: slug,
    metadata: { label, color, isActive, sortOrder },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const { slug } = await params

  const [existing] = await db
    .select()
    .from(questionnaireCategory)
    .where(eq(questionnaireCategory.slug, slug))

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (existing.isSystem) {
    return NextResponse.json({ error: "System types cannot be deleted" }, { status: 403 })
  }

  const [qCount] = await db
    .select({ count: count() })
    .from(questionnaire)
    .where(eq(questionnaire.type, slug))

  const [tCount] = await db
    .select({ count: count() })
    .from(questionnaireTemplate)
    .where(eq(questionnaireTemplate.type, slug))

  const questionnaireCount = Number(qCount?.count ?? 0)
  const templateCount = Number(tCount?.count ?? 0)

  if (questionnaireCount > 0 || templateCount > 0) {
    return NextResponse.json(
      {
        error: "This type is in use and cannot be deleted",
        questionnaireCount,
        templateCount,
      },
      { status: 409 }
    )
  }

  await db.delete(questionnaireCategory).where(eq(questionnaireCategory.slug, slug))

  await logAudit({
    userId: session!.user.id,
    action: "delete",
    entityType: "questionnaire_category",
    entityId: slug,
    metadata: { label: existing.label },
  })

  return new NextResponse(null, { status: 204 })
}
