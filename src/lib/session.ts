import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

export async function getRequestSession(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })
  return session
}

export function requireAuth(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}
