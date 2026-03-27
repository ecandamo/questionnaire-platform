import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaire, shareLink } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { generateShareToken } from "@/lib/tokens"
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

  const [q] = await db.select().from(questionnaire).where(eq(questionnaire.id, id))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const canAccess = session.user.role === "admin" || session.user.id === q.ownerId
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (q.status !== "draft") {
    return NextResponse.json({ error: "Only draft questionnaires can be published" }, { status: 400 })
  }

  const token = generateShareToken()
  const expiresAt = addDays(new Date(), expiryDays)

  await db.update(questionnaire).set({
    status: "shared",
    publishedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(questionnaire.id, id))

  const [link] = await db
    .insert(shareLink)
    .values({
      questionnaireId: id,
      token,
      status: "active",
      expiresAt,
    })
    .returning()

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/respond/${token}`

  await logAudit({
    userId: session.user.id,
    action: "publish",
    entityType: "questionnaire",
    entityId: id,
    metadata: { token, expiresAt },
  })

  return NextResponse.json({ link, shareUrl })
}
