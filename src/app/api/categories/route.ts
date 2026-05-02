import { NextRequest, NextResponse } from "next/server"
import { questionCategory } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { asc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const categories = await tx
        .select()
        .from(questionCategory)
        .orderBy(asc(questionCategory.sortOrder), asc(questionCategory.name))

      return NextResponse.json(categories)
    }
  )
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { name, description, sortOrder } = body

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  return withRls(
    { mode: "auth", userId: session!.user.id, isAdmin: true },
    async (tx) => {
      const [created] = await tx
        .insert(questionCategory)
        .values({ name, description, sortOrder: sortOrder ?? 0 })
        .returning()

      await logAudit(
        {
          userId: session!.user.id,
          action: "create",
          entityType: "question_category",
          entityId: created.id,
          metadata: { name },
        },
        tx
      )

      return NextResponse.json(created, { status: 201 })
    }
  )
}
