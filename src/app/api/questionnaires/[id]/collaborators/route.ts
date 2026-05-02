import { NextRequest, NextResponse } from "next/server"
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
import { withRls } from "@/lib/db/rls-context"
import { and, eq } from "drizzle-orm"

// GET /api/questionnaires/[id]/collaborators
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: questionnaireId } = await params
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx.select().from(questionnaire).where(eq(questionnaire.id, questionnaireId))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      if (!["shared", "in_progress", "submitted"].includes(q.status)) {
        return NextResponse.json({ collaborators: [], responseExists: false })
      }

      const [link] = await tx
        .select()
        .from(shareLink)
        .where(
          and(eq(shareLink.questionnaireId, questionnaireId), eq(shareLink.status, "active"))
        )

      if (!link) return NextResponse.json({ collaborators: [], responseExists: false })

      const [resp] = await tx
        .select()
        .from(response)
        .where(eq(response.shareLinkId, link.id))

      if (!resp) return NextResponse.json({ collaborators: [], responseExists: false })

      const collaborators = await tx
        .select()
        .from(responseCollaborator)
        .where(eq(responseCollaborator.responseId, resp.id))

      const existingAnswers = await tx
        .select()
        .from(answer)
        .where(eq(answer.responseId, resp.id))

      const answeredIds = new Set(existingAnswers.map((a) => a.questionId))

      const result = await Promise.all(
        collaborators
          .filter((c) => c.role === "contributor")
          .map(async (c) => {
            const assignments = await tx
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
  )
}

// POST /api/questionnaires/[id]/collaborators
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
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx.select().from(questionnaire).where(eq(questionnaire.id, questionnaireId))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      if (!["shared", "in_progress"].includes(q.status)) {
        return NextResponse.json(
          { error: "Questionnaire must be published before adding collaborators" },
          { status: 400 }
        )
      }

      const [link] = await tx
        .select()
        .from(shareLink)
        .where(
          and(eq(shareLink.questionnaireId, questionnaireId), eq(shareLink.status, "active"))
        )

      if (!link) return NextResponse.json({ error: "No active share link found" }, { status: 400 })

      // Lazily create response if needed
      let resp = await tx
        .select()
        .from(response)
        .where(eq(response.shareLinkId, link.id))
        .then(([r]) => r)

      if (!resp) {
        const [created] = await tx
          .insert(response)
          .values({ questionnaireId, shareLinkId: link.id, status: "in_progress" })
          .returning()
        resp = created
      }

      const [existing] = await tx
        .select()
        .from(responseCollaborator)
        .where(
          and(
            eq(responseCollaborator.responseId, resp.id),
            eq(responseCollaborator.email, email.toLowerCase().trim())
          )
        )

      if (existing) {
        await tx
          .delete(questionAssignment)
          .where(eq(questionAssignment.collaboratorId, existing.id))

        if (uniqueIds.length > 0) {
          await tx.insert(questionAssignment).values(
            uniqueIds.map((qId) => ({
              responseId: resp.id,
              questionnaireQuestionId: qId,
              collaboratorId: existing.id,
            }))
          )
        }

        if (name && name !== existing.name) {
          await tx
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
      const [collaborator] = await tx
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

      await tx.insert(questionAssignment).values(
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
  )
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
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx.select().from(questionnaire).where(eq(questionnaire.id, questionnaireId))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      const [collab] = await tx
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

      await deleteAnswersForRemovedCollaborator(collab.responseId, collaboratorId, tx)
      await tx.delete(questionAssignment).where(eq(questionAssignment.collaboratorId, collaboratorId))
      await tx.delete(responseCollaborator).where(eq(responseCollaborator.id, collaboratorId))

      return NextResponse.json({ success: true })
    }
  )
}
