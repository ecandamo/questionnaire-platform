import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionCategory } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { eq } from "drizzle-orm"

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
    .update(questionCategory)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(questionCategory.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await logAudit({
    userId: session!.user.id,
    action: "update",
    entityType: "question_category",
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

  await db.delete(questionCategory).where(eq(questionCategory.id, id))

  await logAudit({
    userId: session!.user.id,
    action: "delete",
    entityType: "question_category",
    entityId: id,
  })

  return NextResponse.json({ success: true })
}
