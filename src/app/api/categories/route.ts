import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionCategory } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { asc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const categories = await db
    .select()
    .from(questionCategory)
    .orderBy(asc(questionCategory.sortOrder), asc(questionCategory.name))

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { name, description, sortOrder } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const [created] = await db
    .insert(questionCategory)
    .values({ name, description, sortOrder: sortOrder ?? 0 })
    .returning()

  await logAudit({
    userId: session!.user.id,
    action: "create",
    entityType: "question_category",
    entityId: created.id,
    metadata: { name },
  })

  return NextResponse.json(created, { status: 201 })
}

function requireAuth(session: Awaited<ReturnType<typeof getRequestSession>>) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
