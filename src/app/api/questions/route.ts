import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { question, questionCategory } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { and, asc, eq, ilike, or } from "drizzle-orm"

function requireAuth(session: Awaited<ReturnType<typeof getRequestSession>>) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const categoryId = searchParams.get("categoryId")
  const type = searchParams.get("type")
  const status = searchParams.get("status") ?? "active"

  const conditions = []

  if (status && status !== "all") {
    conditions.push(eq(question.status, status as "active" | "inactive" | "archived"))
  }
  if (categoryId) {
    conditions.push(eq(question.categoryId, categoryId))
  }
  if (type) {
    conditions.push(eq(question.type, type as "short_text" | "long_text" | "number" | "currency" | "percentage" | "date" | "single_select" | "multi_select" | "yes_no" | "section_header"))
  }
  if (search) {
    conditions.push(ilike(question.text, `%${search}%`))
  }

  const questions = await db
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

  return NextResponse.json(questions)
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

  const [created] = await db
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

  await logAudit({
    userId: session!.user.id,
    action: "create",
    entityType: "question",
    entityId: created.id,
    metadata: { text, type },
  })

  return NextResponse.json(created, { status: 201 })
}
