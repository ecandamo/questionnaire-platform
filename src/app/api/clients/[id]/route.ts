import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { client } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { eq } from "drizzle-orm"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const [updated] = await db
    .update(client)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(client.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await db
    .update(client)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(client.id, id))

  return NextResponse.json({ success: true })
}
