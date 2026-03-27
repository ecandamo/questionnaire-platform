import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { response, answer, questionnaire, questionnaireQuestion } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { asc, eq } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [q] = await db.select().from(questionnaire).where(eq(questionnaire.id, id))
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const canAccess = session.user.role === "admin" || session.user.id === q.ownerId
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [resp] = await db
    .select()
    .from(response)
    .where(eq(response.questionnaireId, id))

  if (!resp) return NextResponse.json({ response: null, answers: [], questions: [] })

  const answers = await db.select().from(answer).where(eq(answer.responseId, resp.id))

  const questions = await db
    .select()
    .from(questionnaireQuestion)
    .where(eq(questionnaireQuestion.questionnaireId, id))
    .orderBy(asc(questionnaireQuestion.sortOrder))

  return NextResponse.json({ response: resp, answers, questions })
}
