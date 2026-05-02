import { NextRequest, NextResponse } from "next/server"
import { questionnaire, questionnaireQuestion } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { asc, eq } from "drizzle-orm"

export async function POST(
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
      const [source] = await tx.select().from(questionnaire).where(eq(questionnaire.id, id))
      if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })

      const sourceQuestions = await tx
        .select()
        .from(questionnaireQuestion)
        .where(eq(questionnaireQuestion.questionnaireId, id))
        .orderBy(asc(questionnaireQuestion.sortOrder))

      const [newQ] = await tx
        .insert(questionnaire)
        .values({
          title: `${source.title} (Copy)`,
          type: source.type,
          clientId: source.clientId,
          templateId: source.templateId,
          ownerId: session.user.id,
          status: "draft",
        })
        .returning()

      if (sourceQuestions.length > 0) {
        await tx.insert(questionnaireQuestion).values(
          sourceQuestions.map((row) => {
            const { id: _omitId, questionnaireId: _omitQid, createdAt: _omitCreatedAt, ...rest } = row
            void _omitId
            void _omitQid
            void _omitCreatedAt
            return { ...rest, questionnaireId: newQ.id }
          })
        )
      }

      await logAudit(
        {
          userId: session.user.id,
          action: "duplicate",
          entityType: "questionnaire",
          entityId: newQ.id,
          metadata: { sourceId: id },
        },
        tx
      )

      return NextResponse.json(newQ, { status: 201 })
    }
  )
}
