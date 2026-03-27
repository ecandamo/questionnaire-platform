import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { response, answer, questionnaire, shareLink } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { eq } from "drizzle-orm"

// Create response + save answers (public — no auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json()
  const { token, answers: answerData, submit, respondentName, respondentEmail } = body

  // Verify token
  const [link] = await db.select().from(shareLink).where(eq(shareLink.token, token))
  if (!link || link.status !== "active") {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link has expired" }, { status: 403 })
  }

  // Upsert response
  let [resp] = await db
    .select()
    .from(response)
    .where(eq(response.shareLinkId, link.id))

  if (!resp) {
    const [created] = await db
      .insert(response)
      .values({
        questionnaireId: link.questionnaireId,
        shareLinkId: link.id,
        respondentName: respondentName ?? null,
        respondentEmail: respondentEmail ?? null,
        status: "in_progress",
      })
      .returning()
    resp = created

    // Transition questionnaire to in_progress
    await db
      .update(questionnaire)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(questionnaire.id, link.questionnaireId))
  }

  if (resp.status === "submitted") {
    return NextResponse.json({ error: "This questionnaire has already been submitted" }, { status: 400 })
  }

  // Upsert answers
  if (answerData && Array.isArray(answerData)) {
    for (const a of answerData) {
      const [existing] = await db
        .select()
        .from(answer)
        .where(eq(answer.responseId, resp.id))

      // Check if this question already has an answer
      const [existingAnswer] = await db
        .select()
        .from(answer)
        .where(eq(answer.questionId, a.questionId))

      if (existingAnswer && existingAnswer.responseId === resp.id) {
        await db
          .update(answer)
          .set({ value: a.value, updatedAt: new Date() })
          .where(eq(answer.id, existingAnswer.id))
      } else {
        await db.insert(answer).values({
          responseId: resp.id,
          questionId: a.questionId,
          value: a.value ?? null,
        })
      }
    }
  }

  if (submit) {
    await db
      .update(response)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        respondentName: respondentName ?? resp.respondentName,
        respondentEmail: respondentEmail ?? resp.respondentEmail,
        updatedAt: new Date(),
      })
      .where(eq(response.id, resp.id))

    await db
      .update(questionnaire)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(questionnaire.id, link.questionnaireId))

    await db
      .update(shareLink)
      .set({ status: "closed" })
      .where(eq(shareLink.id, link.id))

    await logAudit({
      action: "submit",
      entityType: "response",
      entityId: resp.id,
      metadata: { questionnaireId: link.questionnaireId },
    })

    return NextResponse.json({ success: true, submitted: true })
  }

  return NextResponse.json({ success: true, responseId: resp.id })
}
