import { NextRequest, NextResponse } from "next/server"
import {
  response,
  answer,
  questionnaire,
  shareLink,
  responseCollaborator,
  questionAssignment,
} from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { and, eq } from "drizzle-orm"

// POST /api/responses/[id]/answers — public, no auth cookie required
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

  // ── Identify token type before opening the transaction ───────────────────────
  // We need to determine which RLS mode to use, so we do a brief pre-check
  // outside any transaction (no RLS on share_link / response_collaborator yet
  // at this stage — they are read by token).
  //
  // Strategy: try share_link first; fall back to response_collaborator.
  // The actual DB reads will be repeated inside the transaction under RLS.

  type TokenKind = "owner" | "contributor"
  let tokenKind: TokenKind | null = null

  // Quick pre-flight (outside RLS) to determine the token kind
  const { db } = await import("@/lib/db")
  const [preLink] = await db.select({ id: shareLink.id }).from(shareLink).where(eq(shareLink.token, token))
  if (preLink) {
    tokenKind = "owner"
  } else {
    const [preCollab] = await db
      .select({ id: responseCollaborator.id })
      .from(responseCollaborator)
      .where(eq(responseCollaborator.token, token))
    if (preCollab) tokenKind = "contributor"
  }

  if (!tokenKind) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
  }

  if (tokenKind === "owner") {
    return handleOwner(questionnaireId, token, { answerData, submit, respondentName, respondentEmail })
  } else {
    return handleContributor(token, { answerData, submit, respondentName, respondentEmail })
  }
}

async function handleOwner(
  questionnaireId: string,
  shareToken: string,
  opts: { answerData: unknown; submit: unknown; respondentName: unknown; respondentEmail: unknown }
) {
  const { answerData, submit, respondentName, respondentEmail } = opts

  return withRls(
    { mode: "share_owner", shareToken },
    async (tx) => {
      const [link] = await tx.select().from(shareLink).where(eq(shareLink.token, shareToken))
      if (!link) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
      if (link.status !== "active" || (link.expiresAt && link.expiresAt < new Date())) {
        return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
      }

      // Resolve or create response
      let resp = await tx
        .select()
        .from(response)
        .where(eq(response.shareLinkId, link.id))
        .then(([r]) => r)

      if (!resp) {
        const [created] = await tx
          .insert(response)
          .values({
            questionnaireId,
            shareLinkId: link.id,
            respondentName: typeof respondentName === "string" ? respondentName : null,
            respondentEmail: typeof respondentEmail === "string" ? respondentEmail : null,
            status: "in_progress",
          })
          .returning()
        resp = created

        await tx
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

      // Upsert answers
      if (answerData && Array.isArray(answerData)) {
        for (const a of answerData) {
          const [existing] = await tx
            .select()
            .from(answer)
            .where(and(eq(answer.responseId, resp.id), eq(answer.questionId, a.questionId)))

          if (existing) {
            const valueChanged = (existing.value ?? "") !== (a.value ?? "")
            await tx
              .update(answer)
              .set({
                value: a.value,
                updatedAt: new Date(),
                lastUpdatedByCollaboratorId: valueChanged
                  ? null
                  : existing.lastUpdatedByCollaboratorId,
              })
              .where(eq(answer.id, existing.id))
          } else {
            await tx.insert(answer).values({
              responseId: resp.id,
              questionId: a.questionId,
              value: a.value ?? null,
              lastUpdatedByCollaboratorId: null,
            })
          }
        }
      }

      // Handle submit
      if (submit) {
        const finalName =
          typeof respondentName === "string" ? respondentName.trim() : (resp.respondentName ?? "").trim()
        const finalEmail =
          typeof respondentEmail === "string" ? respondentEmail.trim() : (resp.respondentEmail ?? "").trim()
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)

        if (!finalName) {
          return NextResponse.json({ error: "Respondent name is required to submit" }, { status: 400 })
        }
        if (!finalEmail || !emailOk) {
          return NextResponse.json(
            { error: "A valid respondent email is required to submit" },
            { status: 400 }
          )
        }

        // Check all contributors have completed
        const allCollaborators = await tx
          .select()
          .from(responseCollaborator)
          .where(
            and(
              eq(responseCollaborator.responseId, resp.id),
              eq(responseCollaborator.role, "contributor")
            )
          )

        const existingAnswers = await tx
          .select()
          .from(answer)
          .where(eq(answer.responseId, resp.id))

        const answeredQuestionIds = new Set(existingAnswers.map((a) => a.questionId))

        for (const collab of allCollaborators) {
          const assignments = await tx
            .select()
            .from(questionAssignment)
            .where(eq(questionAssignment.collaboratorId, collab.id))

          const unanswered = assignments.filter(
            (a) => !answeredQuestionIds.has(a.questionnaireQuestionId)
          )
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

        await tx
          .update(response)
          .set({
            status: "submitted",
            submittedAt: new Date(),
            respondentName: finalName,
            respondentEmail: finalEmail,
            updatedAt: new Date(),
          })
          .where(eq(response.id, resp.id))

        await tx
          .update(questionnaire)
          .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
          .where(eq(questionnaire.id, questionnaireId))

        await tx
          .update(shareLink)
          .set({ status: "closed" })
          .where(eq(shareLink.id, link.id))

        await logAudit(
          {
            action: "submit",
            entityType: "response",
            entityId: resp.id,
            metadata: { questionnaireId },
          },
          tx
        )

        return NextResponse.json({ success: true, submitted: true })
      }

      return NextResponse.json({ success: true, responseId: resp.id })
    }
  )
}

async function handleContributor(
  collaboratorToken: string,
  opts: { answerData: unknown; submit: unknown; respondentName: unknown; respondentEmail: unknown }
) {
  const { answerData, submit, respondentName, respondentEmail } = opts

  return withRls(
    { mode: "share_contributor", collaboratorToken },
    async (tx) => {
      const [collab] = await tx
        .select()
        .from(responseCollaborator)
        .where(eq(responseCollaborator.token, collaboratorToken))

      if (!collab) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })

      const [resp] = await tx
        .select()
        .from(response)
        .where(eq(response.id, collab.responseId))

      if (!resp) return NextResponse.json({ error: "Response not found" }, { status: 404 })

      if (resp.status === "submitted") {
        return NextResponse.json(
          { error: "This questionnaire has already been submitted" },
          { status: 400 }
        )
      }

      // Contributors may only answer assigned questions
      if (answerData && Array.isArray(answerData)) {
        const assignments = await tx
          .select()
          .from(questionAssignment)
          .where(eq(questionAssignment.collaboratorId, collab.id))

        const allowed = new Set(assignments.map((x) => x.questionnaireQuestionId))
        for (const a of answerData) {
          if (!allowed.has(a.questionId)) {
            return NextResponse.json(
              { error: "You can only answer questions assigned to you" },
              { status: 403 }
            )
          }
        }

        for (const a of answerData) {
          const [existing] = await tx
            .select()
            .from(answer)
            .where(and(eq(answer.responseId, resp.id), eq(answer.questionId, a.questionId)))

          if (existing) {
            await tx
              .update(answer)
              .set({
                value: a.value,
                updatedAt: new Date(),
                lastUpdatedByCollaboratorId: collab.id,
              })
              .where(eq(answer.id, existing.id))
          } else {
            await tx.insert(answer).values({
              responseId: resp.id,
              questionId: a.questionId,
              value: a.value ?? null,
              lastUpdatedByCollaboratorId: collab.id,
            })
          }
        }
      }

      // Handle contributor "mark complete"
      if (submit) {
        const finalName =
          typeof respondentName === "string"
            ? respondentName.trim()
            : (collab.name ?? "").trim()
        const finalEmail =
          typeof respondentEmail === "string"
            ? respondentEmail.trim()
            : (collab.email ?? "").trim()
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)

        if (!finalName) {
          return NextResponse.json(
            { error: "Your name is required to mark your section complete" },
            { status: 400 }
          )
        }
        if (!finalEmail || !emailOk) {
          return NextResponse.json(
            { error: "A valid email is required to mark your section complete" },
            { status: 400 }
          )
        }

        await tx
          .update(responseCollaborator)
          .set({
            inviteStatus: "completed",
            name: finalName,
            email: finalEmail,
            updatedAt: new Date(),
          })
          .where(eq(responseCollaborator.id, collab.id))

        return NextResponse.json({ success: true, markedComplete: true })
      }

      return NextResponse.json({ success: true, responseId: resp.id })
    }
  )
}
