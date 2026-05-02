import { NextRequest, NextResponse } from "next/server"
import {
  response,
  responseCollaborator,
  questionAssignment,
  shareLink,
  answer,
  questionnaireQuestion,
} from "@/lib/db/schema"
import { generateShareToken } from "@/lib/tokens"
import { deleteAnswersForRemovedCollaborator } from "@/lib/collaborator-cleanup"
import { withRls } from "@/lib/db/rls-context"
import { and, eq } from "drizzle-orm"

// GET /api/responses/[id]/collaborators?token=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: responseId } = await params
  const token = req.nextUrl.searchParams.get("token") ?? ""

  return withRls(
    { mode: "share_owner", shareToken: token },
    async (tx) => {
      // Verify token → response link
      const [link] = await tx.select().from(shareLink).where(eq(shareLink.token, token))
      if (!link || link.status !== "active") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const [resp] = await tx
        .select()
        .from(response)
        .where(and(eq(response.id, responseId), eq(response.shareLinkId, link.id)))

      if (!resp) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      const collaborators = await tx
        .select()
        .from(responseCollaborator)
        .where(eq(responseCollaborator.responseId, responseId))

      const existingAnswers = await tx
        .select()
        .from(answer)
        .where(eq(answer.responseId, responseId))

      const answeredIds = new Set(existingAnswers.map((a) => a.questionId))

      const result = await Promise.all(
        collaborators.map(async (c) => {
          if (c.role === "owner") {
            const allAssignments = await tx
              .select()
              .from(questionAssignment)
              .where(eq(questionAssignment.responseId, responseId))

            const assignedToOthers = new Set(
              allAssignments
                .filter((a) => a.collaboratorId !== null)
                .map((a) => a.questionnaireQuestionId)
            )

            const allQs = await tx
              .select()
              .from(questionnaireQuestion)
              .where(eq(questionnaireQuestion.questionnaireId, resp.questionnaireId))

            const ownerQuestions = allQs.filter(
              (q) => q.type !== "section_header" && !q.isHidden && !assignedToOthers.has(q.id)
            )

            const answered = ownerQuestions.filter((q) => answeredIds.has(q.id)).length

            return {
              ...c,
              token: c.role === "owner" ? token : c.token,
              assignedCount: ownerQuestions.length,
              answeredCount: answered,
            }
          }

          const assignments = await tx
            .select()
            .from(questionAssignment)
            .where(eq(questionAssignment.collaboratorId, c.id))

          const answered = assignments.filter((a) =>
            answeredIds.has(a.questionnaireQuestionId)
          ).length

          return { ...c, assignedCount: assignments.length, answeredCount: answered }
        })
      )

      return NextResponse.json({ collaborators: result })
    }
  )
}

// POST /api/responses/[id]/collaborators
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: responseId } = await params
  const body = await req.json()
  const { token, email, name, questionIds } = body as {
    token: string
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

  return withRls(
    { mode: "share_owner", shareToken: token },
    async (tx) => {
      const [link] = await tx.select().from(shareLink).where(eq(shareLink.token, token))
      if (!link || link.status !== "active") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const [resp] = await tx
        .select()
        .from(response)
        .where(and(eq(response.id, responseId), eq(response.shareLinkId, link.id)))

      if (!resp) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      const [existing] = await tx
        .select()
        .from(responseCollaborator)
        .where(
          and(
            eq(responseCollaborator.responseId, responseId),
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
              responseId,
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

        return NextResponse.json({ collaborator: { ...existing, name: name ?? existing.name } })
      }

      const collaboratorToken = generateShareToken()

      const [collaborator] = await tx
        .insert(responseCollaborator)
        .values({
          responseId,
          questionnaireId: resp.questionnaireId,
          email: email.toLowerCase().trim(),
          name: name ?? null,
          token: collaboratorToken,
          role: "contributor",
          inviteStatus: "pending",
        })
        .returning()

      await tx.insert(questionAssignment).values(
        uniqueIds.map((qId) => ({
          responseId,
          questionnaireQuestionId: qId,
          collaboratorId: collaborator.id,
        }))
      )

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
      const collaboratorUrl = `${appUrl}/respond/${collaboratorToken}`

      return NextResponse.json({
        collaborator: { ...collaborator, assignedCount: uniqueIds.length, answeredCount: 0 },
        collaboratorUrl,
      })
    }
  )
}

// DELETE /api/responses/[id]/collaborators?collaboratorId=...&token=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: responseId } = await params
  const token = req.nextUrl.searchParams.get("token") ?? ""
  const collaboratorId = req.nextUrl.searchParams.get("collaboratorId") ?? ""

  return withRls(
    { mode: "share_owner", shareToken: token },
    async (tx) => {
      const [link] = await tx.select().from(shareLink).where(eq(shareLink.token, token))
      if (!link || link.status !== "active") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const [resp] = await tx
        .select()
        .from(response)
        .where(and(eq(response.id, responseId), eq(response.shareLinkId, link.id)))

      if (!resp) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      const [collab] = await tx
        .select()
        .from(responseCollaborator)
        .where(
          and(
            eq(responseCollaborator.id, collaboratorId),
            eq(responseCollaborator.responseId, responseId),
            eq(responseCollaborator.role, "contributor")
          )
        )

      if (!collab) return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })

      await deleteAnswersForRemovedCollaborator(responseId, collaboratorId, tx)
      await tx
        .delete(questionAssignment)
        .where(eq(questionAssignment.collaboratorId, collaboratorId))
      await tx.delete(responseCollaborator).where(eq(responseCollaborator.id, collaboratorId))

      return NextResponse.json({ success: true })
    }
  )
}
