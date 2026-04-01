/** IDs of questionnaire questions belonging to the section that starts at `headerIndex` (until next section_header). */
export function getQuestionIdsInSectionAfterHeader(
  questions: { id: string; type: string }[],
  headerIndex: number
): string[] {
  const ids: string[] = []
  for (let i = headerIndex + 1; i < questions.length; i++) {
    const q = questions[i]
    if (q.type === "section_header") break
    ids.push(q.id)
  }
  return ids
}

/** 1-based display index per question id; section_header rows are omitted from numbering. */
export function answerableDisplayNumbers<T extends { id: string; type: string }>(
  questions: T[]
): Map<string, number> {
  const map = new Map<string, number>()
  let n = 0
  for (const q of questions) {
    if (q.type === "section_header") continue
    n += 1
    map.set(q.id, n)
  }
  return map
}
