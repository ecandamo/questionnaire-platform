import { NextRequest, NextResponse } from "next/server"
import { client } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { withRls } from "@/lib/db/rls-context"
import { asc, eq, ilike, and } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const conditions = [eq(client.isActive, true)]
      if (search) conditions.push(ilike(client.name, `%${search}%`))

      const clients = await tx
        .select()
        .from(client)
        .where(and(...conditions))
        .orderBy(asc(client.name))

      return NextResponse.json(clients)
    }
  )
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, industry, contactName, contactEmail } = body

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [created] = await tx
        .insert(client)
        .values({ name, industry, contactName, contactEmail, createdBy: session.user.id })
        .returning()

      return NextResponse.json(created, { status: 201 })
    }
  )
}
