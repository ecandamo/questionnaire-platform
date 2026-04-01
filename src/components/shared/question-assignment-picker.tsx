"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getQuestionIdsInSectionAfterHeader, answerableDisplayNumbers } from "@/lib/question-sections"

export interface AssignmentPickerQuestion {
  id: string
  text: string
  type: string
  isRequired: boolean
}

interface QuestionAssignmentPickerProps {
  questions: AssignmentPickerQuestion[]
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  assignLabel?: string
}

export function QuestionAssignmentPicker({
  questions,
  selectedIds,
  setSelectedIds,
  assignLabel = "Assign questions",
}: QuestionAssignmentPickerProps) {
  const answerable = React.useMemo(
    () => questions.filter((q) => q.type !== "section_header"),
    [questions]
  )
  const displayNumbers = React.useMemo(() => answerableDisplayNumbers(questions), [questions])

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSection(headerIndex: number) {
    const ids = getQuestionIdsInSectionAfterHeader(questions, headerIndex)
    if (ids.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allOn = ids.every((id) => next.has(id))
      if (allOn) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const allAnswerableSelected =
    answerable.length > 0 && answerable.every((q) => selectedIds.has(q.id))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          {assignLabel} <span className="text-destructive">*</span>
        </Label>
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            if (allAnswerableSelected) {
              setSelectedIds(new Set())
            } else {
              setSelectedIds(new Set(answerable.map((q) => q.id)))
            }
          }}
        >
          {allAnswerableSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {questions.map((q, i) => {
          if (q.type === "section_header") {
            const sectionIds = getQuestionIdsInSectionAfterHeader(questions, i)
            const allOn = sectionIds.length > 0 && sectionIds.every((id) => selectedIds.has(id))
            const someOn = sectionIds.some((id) => selectedIds.has(id))
            const checked: boolean | "indeterminate" =
              allOn ? true : someOn ? "indeterminate" : false

            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 px-3 py-2.5 bg-muted/20 ${
                  sectionIds.length > 0
                    ? "hover:bg-muted/40 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                } transition-colors`}
                onClick={() => sectionIds.length > 0 && toggleSection(i)}
              >
                <Checkbox
                  id={`sec-${q.id}`}
                  checked={checked}
                  onCheckedChange={() => sectionIds.length > 0 && toggleSection(i)}
                  disabled={sectionIds.length === 0}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Section
                  </p>
                  <p className="text-xs font-medium leading-snug">{q.text}</p>
                  {sectionIds.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {sectionIds.length} question{sectionIds.length !== 1 ? "s" : ""} in this section
                    </p>
                  )}
                </div>
              </div>
            )
          }

          const num = displayNumbers.get(q.id)
          return (
            <div
              key={q.id}
              className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => toggleQuestion(q.id)}
            >
              <Checkbox
                id={`q-${q.id}`}
                checked={selectedIds.has(q.id)}
                onCheckedChange={() => toggleQuestion(q.id)}
                className="mt-0.5 shrink-0"
              />
              <p className="text-xs leading-snug line-clamp-2 flex-1">
                {num != null && (
                  <span className="text-muted-foreground/50 mr-1.5 font-mono text-[10px] tabular-nums">
                    {num}.
                  </span>
                )}
                {q.text}
                {q.isRequired && <span className="text-destructive ml-1">*</span>}
              </p>
            </div>
          )
        })}
      </div>
      {selectedIds.size > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  )
}
