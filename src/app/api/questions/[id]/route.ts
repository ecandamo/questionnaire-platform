import { NextRequest, NextResponse } from "next/server"
import { question } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { eq } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx.select().from(question).where(eq(question.id, id))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(q)
    }
  )
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

  return withRls(
    { mode: "auth", userId: session!.user.id, isAdmin: true },
    async (tx) => {
      const [updated] = await tx
        .update(question)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(question.id, id))
        .returning()

      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

      await logAudit(
        {
          userId: session!.user.id,
          action: "update",
          entityType: "question",
          entityId: id,
          metadata: body,
        },
        tx
      )

      return NextResponse.json(updated)
    }
  )
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

  return withRls(
    { mode: "auth", userId: session!.user.id, isAdmin: true },
    async (tx) => {
      if (permanent) {
        const [existing] = await tx.select().from(question).where(eq(question.id, id))
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

        await tx.delete(question).where(eq(question.id, id))
        await logAudit(
          { userId: session!.user.id, action: "delete", entityType: "question", entityId: id },
          tx
        )
      } else {
        const [updated] = await tx
          .update(question)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(question.id, id))
          .returning()

        if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

        await logAudit(
          { userId: session!.user.id, action: "archive", entityType: "question", entityId: id },
          tx
        )
      }

      return NextResponse.json({ success: true })
    }
  )
}
