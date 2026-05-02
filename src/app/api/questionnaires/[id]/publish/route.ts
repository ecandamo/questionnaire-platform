import { NextRequest, NextResponse } from "next/server"
import { questionnaire, shareLink } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { generateShareToken } from "@/lib/tokens"
import { withRls } from "@/lib/db/rls-context"
import { eq } from "drizzle-orm"
import { addDays } from "date-fns"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const expiryDays = body.expiryDays ?? Number(process.env.LINK_EXPIRY_DAYS ?? 30)
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx.select().from(questionnaire).where(eq(questionnaire.id, id))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      if (q.status !== "draft") {
        return NextResponse.json(
          { error: "Only draft questionnaires can be published" },
          { status: 400 }
        )
      }

      const token = generateShareToken()
      const expiresAt = addDays(new Date(), expiryDays)

      await tx
        .update(questionnaire)
        .set({ status: "shared", publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(questionnaire.id, id))

      const [link] = await tx
        .insert(shareLink)
        .values({ questionnaireId: id, token, status: "active", expiresAt })
        .returning()

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/respond/${token}`

      await logAudit(
        {
          userId: session.user.id,
          action: "publish",
          entityType: "questionnaire",
          entityId: id,
          metadata: { token, expiresAt },
        },
        tx
      )

      return NextResponse.json({ link, shareUrl })
    }
  )
}
