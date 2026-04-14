import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { response, answer, questionnaire, questionnaireQuestion } from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { asc, eq } from "drizzle-orm"
import { format } from "date-fns"

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

  const questions = await db
    .select()
    .from(questionnaireQuestion)
    .where(eq(questionnaireQuestion.questionnaireId, id))
    .orderBy(asc(questionnaireQuestion.sortOrder))

  const answers = resp
    ? await db.select().from(answer).where(eq(answer.responseId, resp.id))
    : []

  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]))

  const nameCell = `"${(resp?.respondentName ?? "").replace(/"/g, '""')}"`
  const emailCell = `"${(resp?.respondentEmail ?? "").replace(/"/g, '""')}"`

  // Build CSV
  const rows: string[][] = [
    [
      "Question",
      "Type",
      "Required",
      "Answer",
      "Submitted At",
      "Respondent Name",
      "Respondent Email",
    ],
  ]

  for (const q of questions) {
    if (q.isHidden) continue
    rows.push([
      `"${q.text.replace(/"/g, '""')}"`,
      q.type,
      q.isRequired ? "Yes" : "No",
      `"${(answerMap.get(q.id) ?? "").replace(/"/g, '""')}"`,
      resp?.submittedAt ? format(resp.submittedAt, "yyyy-MM-dd HH:mm") : "",
      nameCell,
      emailCell,
    ])
  }

  const csv = rows.map((r) => r.join(",")).join("\n")
  const filename = `questionnaire-${id.slice(0, 8)}-${format(new Date(), "yyyy-MM-dd")}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
