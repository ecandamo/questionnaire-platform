import { NextRequest, NextResponse } from "next/server"
import {
  response,
  answer,
  questionnaire,
  questionnaireQuestion,
  responseCollaborator,
} from "@/lib/db/schema"
import { getRequestSession } from "@/lib/session"
import { withRls } from "@/lib/db/rls-context"
import { asc, eq } from "drizzle-orm"
import { format } from "date-fns"

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

      const questions = await tx
        .select()
        .from(questionnaireQuestion)
        .where(eq(questionnaireQuestion.questionnaireId, id))
        .orderBy(asc(questionnaireQuestion.sortOrder))

      const answers = resp
        ? await tx.select().from(answer).where(eq(answer.responseId, resp.id))
        : []

      const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]))

      const collaborators = resp
        ? await tx
            .select({
              id: responseCollaborator.id,
              name: responseCollaborator.name,
              email: responseCollaborator.email,
            })
            .from(responseCollaborator)
            .where(eq(responseCollaborator.responseId, resp.id))
        : []

      const collabById = new Map(collaborators.map((c) => [c.id, c]))

      function csvEscCell(s: string): string {
        return `"${(s ?? "").replace(/"/g, '""')}"`
      }

      function respondentNameEmailForQuestion(questionnaireQuestionId: string) {
        const primaryName = (resp?.respondentName ?? "").trim()
        const primaryEmail = (resp?.respondentEmail ?? "").trim()
        const ans = answerByQuestionId.get(questionnaireQuestionId)
        if (!ans?.lastUpdatedByCollaboratorId) return { name: primaryName, email: primaryEmail }
        const c = collabById.get(ans.lastUpdatedByCollaboratorId)
        if (!c) return { name: primaryName, email: primaryEmail }
        return { name: (c.name ?? "").trim(), email: (c.email ?? "").trim() }
      }

      const rows: string[][] = [
        ["Question", "Type", "Required", "Answer", "Submitted At", "Respondent Name", "Respondent Email"],
      ]

      for (const q of questions) {
        if (q.isHidden) continue
        const { name: rowName, email: rowEmail } = respondentNameEmailForQuestion(q.id)
        rows.push([
          `"${q.text.replace(/"/g, '""')}"`,
          q.type,
          q.isRequired ? "Yes" : "No",
          `"${(answerByQuestionId.get(q.id)?.value ?? "").replace(/"/g, '""')}"`,
          resp?.submittedAt ? format(resp.submittedAt, "yyyy-MM-dd HH:mm") : "",
          csvEscCell(rowName),
          csvEscCell(rowEmail),
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
  )
}
