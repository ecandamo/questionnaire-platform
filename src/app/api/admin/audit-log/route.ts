import { NextRequest, NextResponse } from "next/server"
import { auditLog, user } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { withRls } from "@/lib/db/rls-context"
import { desc, eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  return withRls(
    { mode: "auth", userId: session!.user.id, isAdmin: true },
    async (tx) => {
      const logs = await tx
        .select({
          id: auditLog.id,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          metadata: auditLog.metadata,
          ipAddress: auditLog.ipAddress,
          createdAt: auditLog.createdAt,
          userId: auditLog.userId,
          userName: user.name,
          userEmail: user.email,
        })
        .from(auditLog)
        .leftJoin(user, eq(auditLog.userId, user.id))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset)

      return NextResponse.json(logs)
    }
  )
}
