import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaire, shareLink, response, responseCollaborator } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { and, eq } from "drizzle-orm"
import { addDays } from "date-fns"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [q] = await db.select().from(questionnaire).where(eq(questionnaire.id, id))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const canAccess = session.user.role === "admin" || session.user.id === q.ownerId
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (q.status !== "submitted") {
    return NextResponse.json({ error: "Only submitted questionnaires can be reopened" }, { status: 400 })
  }

  await db
    .update(questionnaire)
    .set({ status: "shared", submittedAt: null, updatedAt: new Date() })
    .where(eq(questionnaire.id, id))

  // Reactivate the share link or extend expiry (submit sets it to closed)
  await db
    .update(shareLink)
    .set({ status: "active", expiresAt: addDays(new Date(), 30) })
    .where(eq(shareLink.questionnaireId, id))

  // Allow the public link to work again: submit leaves response.status = submitted,
  // which /api/share and POST …/answers treat as "already submitted".
  await db
    .update(response)
    .set({ status: "in_progress", submittedAt: null, updatedAt: new Date() })
    .where(eq(response.questionnaireId, id))

  await db
    .update(responseCollaborator)
    .set({ inviteStatus: "active", updatedAt: new Date() })
    .where(
      and(eq(responseCollaborator.questionnaireId, id), eq(responseCollaborator.inviteStatus, "completed"))
    )

  await logAudit({
    userId: session.user.id,
    action: "reopen",
    entityType: "questionnaire",
    entityId: id,
    metadata: { reopenedBy: session.user.id },
  })

  return NextResponse.json({ success: true })
}
