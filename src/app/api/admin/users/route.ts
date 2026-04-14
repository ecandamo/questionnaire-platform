import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { asc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.name))

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { name, email, password, role } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
  }

  // Use Better Auth admin API to create user
  const result = await fetch(`${process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ name, email, password, role: role ?? "user" }),
  })

  if (!result.ok) {
    const err = await result.json()
    return NextResponse.json({ error: err.message ?? "Failed to create user" }, { status: result.status })
  }

  const created = await result.json()

  await logAudit({
    userId: session!.user.id,
    action: "create_user",
    entityType: "user",
    entityId: created.id,
    metadata: { email, role },
  })

  return NextResponse.json(created, { status: 201 })
}
