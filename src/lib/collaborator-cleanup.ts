import { and, eq, inArray, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { answer, questionAssignment } from "@/lib/db/schema"

/** Delete answers tied to a collaborator: assigned questions + any row last-updated by them. Call before removing assignment rows. */
export async function deleteAnswersForRemovedCollaborator(
  responseId: string,
  collaboratorId: string
): Promise<void> {
  const assignedRows = await db
    .select({ qid: questionAssignment.questionnaireQuestionId })
    .from(questionAssignment)
    .where(eq(questionAssignment.collaboratorId, collaboratorId))

  const qids = [...new Set(assignedRows.map((r) => r.qid))]

  const parts = [eq(answer.lastUpdatedByCollaboratorId, collaboratorId)]
  if (qids.length > 0) {
    parts.push(inArray(answer.questionId, qids))
  }

  await db.delete(answer).where(and(eq(answer.responseId, responseId), or(...parts)))
}
