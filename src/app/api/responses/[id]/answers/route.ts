import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  response,
  answer,
  questionnaire,
  shareLink,
  responseCollaborator,
  questionAssignment,
} from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { and, eq } from "drizzle-orm"

// Create response + save answers (public — no auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionnaireId } = await params
  const body = await req.json()
  const {
    token,
    answers: answerData,
    submit,
    respondentName,
    respondentEmail,
  } = body

  // ── Resolve token to either a share_link (owner) or a collaborator ──────────
  type TokenContext =
    | { kind: "owner"; linkId: string }
    | { kind: "contributor"; collaboratorId: string; responseId: string }

  let ctx: TokenContext | null = null

  const [link] = await db.select().from(shareLink).where(eq(shareLink.token, token))
  if (link) {
    if (link.status !== "active" || (link.expiresAt && link.expiresAt < new Date())) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
    }
    ctx = { kind: "owner", linkId: link.id }
  } else {
    const [collab] = await db
      .select()
      .from(responseCollaborator)
      .where(eq(responseCollaborator.token, token))

    if (!collab) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
    }
    ctx = { kind: "contributor", collaboratorId: collab.id, responseId: collab.responseId }
  }

  // ── Resolve / create the master response row ─────────────────────────────────
  let resp: typeof response.$inferSelect | undefined

  if (ctx.kind === "owner") {
    const [existing] = await db
      .select()
      .from(response)
      .where(eq(response.shareLinkId, ctx.linkId))
    resp = existing
  } else {
    const [existing] = await db
      .select()
      .from(response)
      .where(eq(response.id, ctx.responseId))
    resp = existing
  }

  if (!resp) {
    if (ctx.kind !== "owner") {
      // Collaborator should always have a pre-existing response
      return NextResponse.json({ error: "Response not found" }, { status: 404 })
    }
    const [created] = await db
      .insert(response)
      .values({
        questionnaireId,
        shareLinkId: ctx.linkId,
        respondentName: respondentName ?? null,
        respondentEmail: respondentEmail ?? null,
        status: "in_progress",
      })
      .returning()
    resp = created

    await db
      .update(questionnaire)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(questionnaire.id, questionnaireId))
  }

  if (resp.status === "submitted") {
    return NextResponse.json(
      { error: "This questionnaire has already been submitted" },
      { status: 400 }
    )
  }

  const attributionCollaboratorId =
    ctx.kind === "contributor" ? ctx.collaboratorId : null

  // ── Contributors may only write assigned questions ───────────────────────────
  if (ctx.kind === "contributor" && answerData && Array.isArray(answerData)) {
    const assignments = await db
      .select()
      .from(questionAssignment)
      .where(eq(questionAssignment.collaboratorId, ctx.collaboratorId))

    const allowed = new Set(assignments.map((x) => x.questionnaireQuestionId))
    for (const a of answerData) {
      if (!allowed.has(a.questionId)) {
        return NextResponse.json(
          { error: "You can only answer questions assigned to you" },
          { status: 403 }
        )
      }
    }
  }

  // ── Upsert answers ────────────────────────────────────────────────────────────
  if (answerData && Array.isArray(answerData)) {
    for (const a of answerData) {
      const [existingAnswer] = await db
        .select()
        .from(answer)
        .where(and(eq(answer.responseId, resp.id), eq(answer.questionId, a.questionId)))

      if (existingAnswer) {
        if (ctx.kind === "contributor") {
          await db
            .update(answer)
            .set({
              value: a.value,
              updatedAt: new Date(),
              lastUpdatedByCollaboratorId: attributionCollaboratorId,
            })
            .where(eq(answer.id, existingAnswer.id))
        } else {
          const valueChanged = (existingAnswer.value ?? "") !== (a.value ?? "")
          await db
            .update(answer)
            .set({
              value: a.value,
              updatedAt: new Date(),
              lastUpdatedByCollaboratorId: valueChanged
                ? null
                : existingAnswer.lastUpdatedByCollaboratorId,
            })
            .where(eq(answer.id, existingAnswer.id))
        }
      } else {
        await db.insert(answer).values({
          responseId: resp.id,
          questionId: a.questionId,
          value: a.value ?? null,
          lastUpdatedByCollaboratorId:
            ctx.kind === "contributor" ? attributionCollaboratorId : null,
        })
      }
    }
  }

  // ── Handle contributor "mark complete" ────────────────────────────────────────
  if (submit && ctx.kind === "contributor") {
    const [collabRow] = await db
      .select()
      .from(responseCollaborator)
      .where(eq(responseCollaborator.id, ctx.collaboratorId))

    if (!collabRow) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })
    }

    const finalCollabName =
      typeof respondentName === "string"
        ? respondentName.trim()
        : (collabRow.name ?? "").trim()
    const finalCollabEmail =
      typeof respondentEmail === "string"
        ? respondentEmail.trim()
        : (collabRow.email ?? "").trim()
    const collabEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalCollabEmail)
    if (!finalCollabName) {
      return NextResponse.json(
        { error: "Your name is required to mark your section complete" },
        { status: 400 }
      )
    }
    if (!finalCollabEmail || !collabEmailOk) {
      return NextResponse.json(
        { error: "A valid email is required to mark your section complete" },
        { status: 400 }
      )
    }

    await db
      .update(responseCollaborator)
      .set({
        inviteStatus: "completed",
        name: finalCollabName,
        email: finalCollabEmail,
        updatedAt: new Date(),
      })
      .where(eq(responseCollaborator.id, ctx.collaboratorId))

    return NextResponse.json({ success: true, markedComplete: true })
  }

  // ── Handle owner full submit ──────────────────────────────────────────────────
  if (submit && ctx.kind === "owner") {
    const finalName =
      typeof respondentName === "string"
        ? respondentName.trim()
        : (resp.respondentName ?? "").trim()
    const finalEmail =
      typeof respondentEmail === "string"
        ? respondentEmail.trim()
        : (resp.respondentEmail ?? "").trim()
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)
    if (!finalName) {
      return NextResponse.json(
        { error: "Respondent name is required to submit" },
        { status: 400 }
      )
    }
    if (!finalEmail || !emailOk) {
      return NextResponse.json(
        { error: "A valid respondent email is required to submit" },
        { status: 400 }
      )
    }

    // Check all collaborators have completed their assigned questions
    const allCollaborators = await db
      .select()
      .from(responseCollaborator)
      .where(
        and(
          eq(responseCollaborator.responseId, resp.id),
          eq(responseCollaborator.role, "contributor")
        )
      )

    // For each contributor, check their assigned questions are answered
    const existingAnswers = await db
      .select()
      .from(answer)
      .where(eq(answer.responseId, resp.id))

    const answeredQuestionIds = new Set(existingAnswers.map((a) => a.questionId))

    for (const collab of allCollaborators) {
      const assignments = await db
        .select()
        .from(questionAssignment)
        .where(eq(questionAssignment.collaboratorId, collab.id))

      const unanswered = assignments.filter((a) => !answeredQuestionIds.has(a.questionnaireQuestionId))
      if (unanswered.length > 0) {
        return NextResponse.json(
          {
            error: `Collaborator ${collab.name ?? collab.email} has ${unanswered.length} unanswered assigned question(s)`,
            collaboratorIncomplete: true,
          },
          { status: 400 }
        )
      }
    }

    await db
      .update(response)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        respondentName: finalName,
        respondentEmail: finalEmail,
        updatedAt: new Date(),
      })
      .where(eq(response.id, resp.id))

    await db
      .update(questionnaire)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(questionnaire.id, questionnaireId))

    // Close owner's share link
    if (link) {
      await db
        .update(shareLink)
        .set({ status: "closed" })
        .where(eq(shareLink.id, link.id))
    }

    await logAudit({
      action: "submit",
      entityType: "response",
      entityId: resp.id,
      metadata: { questionnaireId },
    })

    return NextResponse.json({ success: true, submitted: true })
  }

  return NextResponse.json({ success: true, responseId: resp.id })
}
