import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { shareLink, questionnaire, questionnaireQuestion, client, response } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const [link] = await db
    .select()
    .from(shareLink)
    .where(eq(shareLink.token, token))

  if (!link) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

  if (link.status === "closed") {
    return NextResponse.json({ error: "This link has been closed" }, { status: 410 })
  }

  if (link.status === "expired" || (link.expiresAt && link.expiresAt < new Date())) {
    if (link.status !== "expired") {
      await db.update(shareLink).set({ status: "expired" }).where(eq(shareLink.id, link.id))
    }
    return NextResponse.json({ error: "This link has expired" }, { status: 410 })
  }

  const [q] = await db
    .select({
      id: questionnaire.id,
      title: questionnaire.title,
      type: questionnaire.type,
      status: questionnaire.status,
      clientName: client.name,
    })
    .from(questionnaire)
    .leftJoin(client, eq(questionnaire.clientId, client.id))
    .where(eq(questionnaire.id, link.questionnaireId))

  if (!q) return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 })

  if (q.status === "submitted") {
    return NextResponse.json({ error: "This questionnaire has already been submitted" }, { status: 410 })
  }

  const questions = await db
    .select()
    .from(questionnaireQuestion)
    .where(eq(questionnaireQuestion.questionnaireId, q.id))
    .orderBy(asc(questionnaireQuestion.sortOrder))

  // Exclude hidden questions for respondent view
  const visibleQuestions = questions.filter((q) => !q.isHidden)

  // Find or create response record
  let [existing] = await db
    .select()
    .from(response)
    .where(eq(response.shareLinkId, link.id))

  return NextResponse.json({
    questionnaire: q,
    questions: visibleQuestions,
    link: { id: link.id, expiresAt: link.expiresAt },
    responseId: existing?.id ?? null,
    responseStatus: existing?.status ?? null,
  })
}
