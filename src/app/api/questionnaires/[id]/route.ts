import { NextRequest, NextResponse } from "next/server"
import { questionnaire, questionnaireQuestion, client, user, shareLink } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { and, asc, desc, eq } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [q] = await tx
        .select({
          id: questionnaire.id,
          title: questionnaire.title,
          type: questionnaire.type,
          status: questionnaire.status,
          clientId: questionnaire.clientId,
          clientName: client.name,
          ownerId: questionnaire.ownerId,
          ownerName: user.name,
          templateId: questionnaire.templateId,
          publishedAt: questionnaire.publishedAt,
          submittedAt: questionnaire.submittedAt,
          createdAt: questionnaire.createdAt,
          updatedAt: questionnaire.updatedAt,
        })
        .from(questionnaire)
        .leftJoin(client, eq(questionnaire.clientId, client.id))
        .leftJoin(user, eq(questionnaire.ownerId, user.id))
        .where(eq(questionnaire.id, id))

      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      const questions = await tx
        .select()
        .from(questionnaireQuestion)
        .where(eq(questionnaireQuestion.questionnaireId, id))
        .orderBy(asc(questionnaireQuestion.sortOrder))

      const [activeLink] = await tx
        .select({ token: shareLink.token })
        .from(shareLink)
        .where(and(eq(shareLink.questionnaireId, id), eq(shareLink.status, "active")))
        .orderBy(desc(shareLink.createdAt))
        .limit(1)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
      const shareUrl = activeLink?.token
        ? `${appUrl.replace(/\/$/, "")}/respond/${activeLink.token}`
        : null

      return NextResponse.json({ ...q, questions, shareUrl })
    }
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { questions: questionUpdates, ...questionnaireData } = body
  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [existing] = await tx
        .select()
        .from(questionnaire)
        .where(eq(questionnaire.id, id))

      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
      if (existing.status !== "draft") {
        return NextResponse.json(
          { error: "Published questionnaires cannot be edited" },
          { status: 400 }
        )
      }

      const [updated] = await tx
        .update(questionnaire)
        .set({ ...questionnaireData, updatedAt: new Date() })
        .where(eq(questionnaire.id, id))
        .returning()

      if (questionUpdates !== undefined) {
        await tx
          .delete(questionnaireQuestion)
          .where(eq(questionnaireQuestion.questionnaireId, id))
        if (questionUpdates.length > 0) {
          try {
            await tx.insert(questionnaireQuestion).values(
              questionUpdates.map((q: Record<string, unknown>, i: number) => ({
                ...q,
                questionnaireId: id,
                sortOrder: i,
              }))
            )
          } catch (e) {
            const message = e instanceof Error ? e.message : "Insert failed"
            return NextResponse.json({ error: message }, { status: 400 })
          }
        }
      }

      await logAudit(
        {
          userId: session.user.id,
          action: "update",
          entityType: "questionnaire",
          entityId: id,
          metadata: questionnaireData,
        },
        tx
      )

      return NextResponse.json(updated)
    }
  )
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const permanent = req.nextUrl.searchParams.get("permanent") === "true"
  const isAdmin = session.user.role === "admin"

  if (permanent && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const [existing] = await tx
        .select()
        .from(questionnaire)
        .where(eq(questionnaire.id, id))

      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

      if (permanent) {
        await tx.delete(questionnaire).where(eq(questionnaire.id, id))
        await logAudit(
          { userId: session.user.id, action: "delete", entityType: "questionnaire", entityId: id },
          tx
        )
      } else {
        await tx
          .update(questionnaire)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(questionnaire.id, id))
        await logAudit(
          { userId: session.user.id, action: "archive", entityType: "questionnaire", entityId: id },
          tx
        )
      }

      return NextResponse.json({ success: true })
    }
  )
}
