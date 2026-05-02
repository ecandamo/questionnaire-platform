import { NextRequest, NextResponse } from "next/server"
import { response, answer, questionnaire, questionnaireQuestion } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { withRls } from "@/lib/db/rls-context"
import { asc, eq } from "drizzle-orm"

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
      const [q] = await tx.select().from(questionnaire).where(eq(questionnaire.id, id))
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

      const [resp] = await tx.select().from(response).where(eq(response.questionnaireId, id))
      if (!resp) return NextResponse.json({ response: null, answers: [], questions: [] })

      const answers = await tx.select().from(answer).where(eq(answer.responseId, resp.id))

      const questions = await tx
        .select()
        .from(questionnaireQuestion)
        .where(eq(questionnaireQuestion.questionnaireId, id))
        .orderBy(asc(questionnaireQuestion.sortOrder))

      return NextResponse.json({ response: resp, answers, questions })
    }
  )
}
