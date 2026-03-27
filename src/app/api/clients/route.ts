import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { client } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { asc, eq, ilike, and } from "drizzle-orm"

function requireAuth(session: Awaited<ReturnType<typeof getRequestSession>>) {
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")

  const conditions = [eq(client.isActive, true)]
  if (search) conditions.push(ilike(client.name, `%${search}%`))

  const clients = await db
    .select()
    .from(client)
    .where(and(...conditions))
    .orderBy(asc(client.name))

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const body = await req.json()
  const { name, industry, contactName, contactEmail } = body

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const [created] = await db
    .insert(client)
    .values({
      name,
      industry,
      contactName,
      contactEmail,
      createdBy: session!.user.id,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
