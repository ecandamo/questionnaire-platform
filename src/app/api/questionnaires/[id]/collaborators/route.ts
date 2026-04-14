import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  questionnaire,
  shareLink,
  response,
  responseCollaborator,
  questionAssignment,
  answer,
} from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { generateShareToken } from "@/lib/tokens"
import { deleteAnswersForRemovedCollaborator } from "@/lib/collaborator-cleanup"
import { and, eq } from "drizzle-orm"

// ── Resolve or lazily create the master response for a published questionnaire ─
async function getOrCreateResponse(questionnaireId: string, linkId: string) {
  const [existing] = await db
    .select()
    .from(response)
    .where(eq(response.shareLinkId, linkId))

  if (existing) return existing

  const [created] = await db
    .insert(response)
    .values({
      questionnaireId,
      shareLinkId: linkId,
      status: "in_progress",
    })
    .returning()

  return created
}

// GET /api/questionnaires/[id]/collaborators
// Returns collaborators + per-collaborator progress (authenticated sender view)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: questionnaireId } = await params
  const [q] = await db.select().from(questionnaire).where(eq(questionnaire.id, questionnaireId))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const canAccess = session.user.role === "admin" || session.user.id === q.ownerId
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!["shared", "in_progress", "submitted"].includes(q.status)) {
    return NextResponse.json({ collaborators: [], responseExists: false })
  }

  const [link] = await db
    .select()
    .from(shareLink)
    .where(and(eq(shareLink.questionnaireId, questionnaireId), eq(shareLink.status, "active")))

  if (!link) return NextResponse.json({ collaborators: [], responseExists: false })

  const [resp] = await db
    .select()
    .from(response)
    .where(eq(response.shareLinkId, link.id))

  if (!resp) return NextResponse.json({ collaborators: [], responseExists: false })

  const collaborators = await db
    .select()
    .from(responseCollaborator)
    .where(eq(responseCollaborator.responseId, resp.id))

  const existingAnswers = await db
    .select()
    .from(answer)
    .where(eq(answer.responseId, resp.id))

  const answeredIds = new Set(existingAnswers.map((a) => a.questionId))

  const result = await Promise.all(
    collaborators
      .filter((c) => c.role === "contributor")
      .map(async (c) => {
        const assignments = await db
          .select()
          .from(questionAssignment)
          .where(eq(questionAssignment.collaboratorId, c.id))

        const answered = assignments.filter((a) =>
          answeredIds.has(a.questionnaireQuestionId)
        ).length

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
        return {
          ...c,
          assignedCount: assignments.length,
          answeredCount: answered,
          collaboratorUrl: `${appUrl}/respond/${c.token}`,
        }
      })
  )

  return NextResponse.json({
    collaborators: result,
    responseExists: true,
    responseId: resp.id,
    shareToken: link.token,
  })
}

// POST /api/questionnaires/[id]/collaborators
// Body: { email, name?, questionIds: string[] }
// Sender pre-assigns questions to a client team member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: questionnaireId } = await params
  const body = await req.json()
  const { email, name, questionIds } = body as {
    email: string
    name?: string
    questionIds: string[]
  }

  if (!email || !Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json(
      { error: "email and at least one questionId are required" },
      { status: 400 }
    )
  }

  const uniqueIds = [...new Set(questionIds)]

  const [q] = await db.select().from(questionnaire).where(eq(questionnaire.id, questionnaireId))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const canAccess = session.user.role === "admin" || session.user.id === q.ownerId
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!["shared", "in_progress"].includes(q.status)) {
    return NextResponse.json(
      { error: "Questionnaire must be published before adding collaborators" },
      { status: 400 }
    )
  }

  const [link] = await db
    .select()
    .from(shareLink)
    .where(and(eq(shareLink.questionnaireId, questionnaireId), eq(shareLink.status, "active")))

  if (!link) {
    return NextResponse.json({ error: "No active share link found" }, { status: 400 })
  }

  // Lazily create response if it doesn't exist yet
  const resp = await getOrCreateResponse(questionnaireId, link.id)

  // Check for existing collaborator with this email
  const [existing] = await db
    .select()
    .from(responseCollaborator)
    .where(
      and(
        eq(responseCollaborator.responseId, resp.id),
        eq(responseCollaborator.email, email.toLowerCase().trim())
      )
    )

  if (existing) {
    // Update their assignments
    await db
      .delete(questionAssignment)
      .where(eq(questionAssignment.collaboratorId, existing.id))

    if (uniqueIds.length > 0) {
      await db.insert(questionAssignment).values(
        uniqueIds.map((qId) => ({
          responseId: resp.id,
          questionnaireQuestionId: qId,
          collaboratorId: existing.id,
        }))
      )
    }

    if (name && name !== existing.name) {
      await db
        .update(responseCollaborator)
        .set({ name, updatedAt: new Date() })
        .where(eq(responseCollaborator.id, existing.id))
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
    return NextResponse.json({
      collaborator: { ...existing, name: name ?? existing.name },
      collaboratorUrl: `${appUrl}/respond/${existing.token}`,
    })
  }

  const collaboratorToken = generateShareToken()
  const [collaborator] = await db
    .insert(responseCollaborator)
    .values({
      responseId: resp.id,
      questionnaireId,
      email: email.toLowerCase().trim(),
      name: name ?? null,
      token: collaboratorToken,
      role: "contributor",
      inviteStatus: "pending",
    })
    .returning()

  await db.insert(questionAssignment).values(
    uniqueIds.map((qId) => ({
      responseId: resp.id,
      questionnaireQuestionId: qId,
      collaboratorId: collaborator.id,
    }))
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const collaboratorUrl = `${appUrl}/respond/${collaboratorToken}`

  return NextResponse.json({
    collaborator: {
      ...collaborator,
      assignedCount: uniqueIds.length,
      answeredCount: 0,
      collaboratorUrl,
    },
    collaboratorUrl,
  })
}

// DELETE /api/questionnaires/[id]/collaborators?collaboratorId=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: questionnaireId } = await params
  const collaboratorId = req.nextUrl.searchParams.get("collaboratorId") ?? ""

  const [q] = await db.select().from(questionnaire).where(eq(questionnaire.id, questionnaireId))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const canAccess = session.user.role === "admin" || session.user.id === q.ownerId
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [collab] = await db
    .select()
    .from(responseCollaborator)
    .where(
      and(
        eq(responseCollaborator.id, collaboratorId),
        eq(responseCollaborator.questionnaireId, questionnaireId),
        eq(responseCollaborator.role, "contributor")
      )
    )

  if (!collab) return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })

  await deleteAnswersForRemovedCollaborator(collab.responseId, collaboratorId)

  await db
    .delete(questionAssignment)
    .where(eq(questionAssignment.collaboratorId, collaboratorId))

  await db
    .delete(responseCollaborator)
    .where(eq(responseCollaborator.id, collaboratorId))

  return NextResponse.json({ success: true })
}
