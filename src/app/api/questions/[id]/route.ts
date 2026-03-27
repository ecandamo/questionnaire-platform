import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { question } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { eq } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [q] = await db.select().from(question).where(eq(question.id, id))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(q)
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

  const [updated] = await db
    .update(question)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(question.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await logAudit({
    userId: session!.user.id,
    action: "update",
    entityType: "question",
    entityId: id,
    metadata: body,
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

  // Soft archive instead of hard delete to preserve history
  const [updated] = await db
    .update(question)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(question.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await logAudit({
    userId: session!.user.id,
    action: "archive",
    entityType: "question",
    entityId: id,
  })

  return NextResponse.json({ success: true })
}
