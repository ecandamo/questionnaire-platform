import { NextRequest, NextResponse } from "next/server"
import { questionnaire, shareLink, response, responseCollaborator } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { and, eq } from "drizzle-orm"
import { addDays } from "date-fns"

export async function POST(
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
      const [q] = await tx.select().from(questionnaire).where(eq(questionnaire.id, id))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      if (q.status !== "submitted") {
        return NextResponse.json(
          { error: "Only submitted questionnaires can be reopened" },
          { status: 400 }
        )
      }

      await tx
        .update(questionnaire)
        .set({ status: "shared", submittedAt: null, updatedAt: new Date() })
        .where(eq(questionnaire.id, id))

      await tx
        .update(shareLink)
        .set({ status: "active", expiresAt: addDays(new Date(), 30) })
        .where(eq(shareLink.questionnaireId, id))

      await tx
        .update(response)
        .set({ status: "in_progress", submittedAt: null, updatedAt: new Date() })
        .where(eq(response.questionnaireId, id))

      await tx
        .update(responseCollaborator)
        .set({ inviteStatus: "active", updatedAt: new Date() })
        .where(
          and(
            eq(responseCollaborator.questionnaireId, id),
            eq(responseCollaborator.inviteStatus, "completed")
          )
        )

      await logAudit(
        {
          userId: session.user.id,
          action: "reopen",
          entityType: "questionnaire",
          entityId: id,
          metadata: { reopenedBy: session.user.id },
        },
        tx
      )

      return NextResponse.json({ success: true })
    }
  )
}
