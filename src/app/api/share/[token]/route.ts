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
} from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"

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

    const [existing] = await db
      .select()
      .from(response)
      .where(eq(response.shareLinkId, link.id))

    return NextResponse.json({
      questionnaire: q,
      questions: visibleQuestions,
      link: { id: link.id, expiresAt: link.expiresAt },
      responseId: existing?.id ?? null,
      responseStatus: existing?.status ?? null,
      viewerRole: "owner" as const,
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

  // Check parent questionnaire status
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

  // Mark collaborator as active on first visit
  if (collaborator.inviteStatus === "pending") {
    await db
      .update(responseCollaborator)
      .set({ inviteStatus: "active", updatedAt: new Date() })
      .where(eq(responseCollaborator.id, collaborator.id))
  }

  // Load all visible questions for this questionnaire
  const allQuestions = await db
    .select()
    .from(questionnaireQuestion)
    .where(eq(questionnaireQuestion.questionnaireId, q.id))
    .orderBy(asc(questionnaireQuestion.sortOrder))

  const visibleQuestions = allQuestions.filter((qq) => !qq.isHidden)

  // Get assigned question IDs for this collaborator
  const assignments = await db
    .select()
    .from(questionAssignment)
    .where(eq(questionAssignment.collaboratorId, collaborator.id))

  const assignedIds = new Set(assignments.map((a) => a.questionnaireQuestionId))

  // Contributors see only their assigned questions (plus any section_header that precedes them)
  const assignedQuestions = visibleQuestions.filter(
    (qq) => qq.type === "section_header" || assignedIds.has(qq.id)
  )

  // Strip leading section_headers that have no assigned questions after them
  const trimmedQuestions = stripOrphanedSectionHeaders(assignedQuestions, assignedIds)

  const [resp] = await db
    .select()
    .from(response)
    .where(eq(response.id, collaborator.responseId))

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
  })
}

// Remove section_headers that have no answerable questions following them
function stripOrphanedSectionHeaders(
  questions: { id: string; type: string }[],
  assignedIds: Set<string>
): typeof questions {
  const result: typeof questions = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (q.type === "section_header") {
      // Look ahead: is there at least one non-header assigned question after this?
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
