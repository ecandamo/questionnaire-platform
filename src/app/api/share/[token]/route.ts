import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  shareLink,
  questionnaire,
  questionnaireQuestion,
  client,
  response,
  responseCollaborator,
  questionAssignment,
  answer,
} from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"

function buildAnswerRows(
  rows: { questionId: string; value: string | null; lastUpdatedByCollaboratorId: string | null }[],
  collabById: Map<string, { name: string | null; email: string }>
) {
  return rows.map((r) => ({
    questionId: r.questionId,
    value: r.value ?? "",
    answeredByLabel: r.lastUpdatedByCollaboratorId
      ? (() => {
          const c = collabById.get(r.lastUpdatedByCollaboratorId)
          return c ? (c.name?.trim() ? `${c.name} (${c.email})` : c.email) : "Team member"
        })()
      : "Primary respondent",
  }))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // ── Try owner share_link first ──────────────────────────────────────────────
  const [link] = await db
    .select()
    .from(shareLink)
    .where(eq(shareLink.token, token))

  if (link) {
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
      return NextResponse.json(
        { error: "This questionnaire has already been submitted" },
        { status: 410 }
      )
    }

    const questions = await db
      .select()
      .from(questionnaireQuestion)
      .where(eq(questionnaireQuestion.questionnaireId, q.id))
      .orderBy(asc(questionnaireQuestion.sortOrder))

    const visibleQuestions = questions.filter((qq) => !qq.isHidden)

    let [existingResponse] = await db
      .select()
      .from(response)
      .where(eq(response.shareLinkId, link.id))

    // Eager response so Team panel + collaborator APIs work before first save
    if (!existingResponse) {
      const [created] = await db
        .insert(response)
        .values({
          questionnaireId: link.questionnaireId,
          shareLinkId: link.id,
          status: "in_progress",
        })
        .returning()
      existingResponse = created

      await db
        .update(questionnaire)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(and(eq(questionnaire.id, link.questionnaireId), eq(questionnaire.status, "shared")))
    }

    const collaborators = await db
      .select({
        id: responseCollaborator.id,
        name: responseCollaborator.name,
        email: responseCollaborator.email,
      })
      .from(responseCollaborator)
      .where(eq(responseCollaborator.responseId, existingResponse.id))

    const collabById = new Map(collaborators.map((c) => [c.id, c]))

    const answerRows = await db
      .select({
        questionId: answer.questionId,
        value: answer.value,
        lastUpdatedByCollaboratorId: answer.lastUpdatedByCollaboratorId,
      })
      .from(answer)
      .where(eq(answer.responseId, existingResponse.id))

    const answersPayload = buildAnswerRows(answerRows, collabById)

    return NextResponse.json({
      questionnaire: q,
      questions: visibleQuestions,
      link: { id: link.id, expiresAt: link.expiresAt },
      responseId: existingResponse.id,
      responseStatus: existingResponse.status,
      viewerRole: "owner" as const,
      answers: answersPayload,
    })
  }

  // ── Try collaborator token ───────────────────────────────────────────────────
  const [collaborator] = await db
    .select()
    .from(responseCollaborator)
    .where(eq(responseCollaborator.token, token))

  if (!collaborator) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 })
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
    .where(eq(questionnaire.id, collaborator.questionnaireId))

  if (!q) return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 })

  if (q.status === "submitted") {
    return NextResponse.json(
      { error: "This questionnaire has already been submitted" },
      { status: 410 }
    )
  }

  if (collaborator.inviteStatus === "pending") {
    await db
      .update(responseCollaborator)
      .set({ inviteStatus: "active", updatedAt: new Date() })
      .where(eq(responseCollaborator.id, collaborator.id))
  }

  const allQuestions = await db
    .select()
    .from(questionnaireQuestion)
    .where(eq(questionnaireQuestion.questionnaireId, q.id))
    .orderBy(asc(questionnaireQuestion.sortOrder))

  const visibleQuestions = allQuestions.filter((qq) => !qq.isHidden)

  const assignments = await db
    .select()
    .from(questionAssignment)
    .where(eq(questionAssignment.collaboratorId, collaborator.id))

  const assignedIds = new Set(assignments.map((a) => a.questionnaireQuestionId))

  const assignedQuestions = visibleQuestions.filter(
    (qq) => qq.type === "section_header" || assignedIds.has(qq.id)
  )

  const trimmedQuestions = stripOrphanedSectionHeaders(assignedQuestions, assignedIds)

  const [resp] = await db
    .select()
    .from(response)
    .where(eq(response.id, collaborator.responseId))

  const collaborators = await db
    .select({
      id: responseCollaborator.id,
      name: responseCollaborator.name,
      email: responseCollaborator.email,
    })
    .from(responseCollaborator)
    .where(eq(responseCollaborator.responseId, collaborator.responseId))

  const collabById = new Map(collaborators.map((c) => [c.id, c]))

  let answersPayload: ReturnType<typeof buildAnswerRows> = []
  if (resp) {
    const answerRows = await db
      .select({
        questionId: answer.questionId,
        value: answer.value,
        lastUpdatedByCollaboratorId: answer.lastUpdatedByCollaboratorId,
      })
      .from(answer)
      .where(eq(answer.responseId, resp.id))

    const full = buildAnswerRows(answerRows, collabById)
    answersPayload = full.filter((a) => assignedIds.has(a.questionId))
  }

  return NextResponse.json({
    questionnaire: q,
    questions: trimmedQuestions,
    link: { id: null, expiresAt: null },
    responseId: resp?.id ?? null,
    responseStatus: resp?.status ?? null,
    viewerRole: "contributor" as const,
    collaboratorId: collaborator.id,
    collaboratorName: collaborator.name,
    collaboratorEmail: collaborator.email,
    answers: answersPayload,
  })
}

function stripOrphanedSectionHeaders(
  questions: { id: string; type: string }[],
  assignedIds: Set<string>
): typeof questions {
  const result: typeof questions = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (q.type === "section_header") {
      const hasFollowingQuestion = questions
        .slice(i + 1)
        .some((next) => next.type !== "section_header" && assignedIds.has(next.id))
      if (hasFollowingQuestion) result.push(q)
    } else {
      result.push(q)
    }
  }
  return result
}
