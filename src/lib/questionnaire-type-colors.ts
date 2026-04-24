export const QUESTIONNAIRE_TYPE_COLOR_OPTIONS = [
  { value: "slate", label: "Slate", className: "border-slate-500/30 bg-slate-500/10 text-slate-900 dark:text-slate-200" },
  { value: "blue", label: "Blue", className: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200" },
  { value: "violet", label: "Violet", className: "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-200" },
  { value: "emerald", label: "Emerald", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" },
  { value: "amber", label: "Amber", className: "border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-200" },
  { value: "rose", label: "Rose", className: "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200" },
  { value: "teal", label: "Teal", className: "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200" },
  { value: "fuchsia", label: "Fuchsia", className: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-900 dark:text-fuchsia-200" },
] as const

export type QuestionnaireTypeColor = (typeof QUESTIONNAIRE_TYPE_COLOR_OPTIONS)[number]["value"]

export const DEFAULT_QUESTIONNAIRE_TYPE_COLOR: QuestionnaireTypeColor = "slate"

export function getQuestionnaireTypePillClass(color: string | null | undefined): string {
  const match = QUESTIONNAIRE_TYPE_COLOR_OPTIONS.find((option) => option.value === color)
  return match?.className ?? QUESTIONNAIRE_TYPE_COLOR_OPTIONS[0].className
}
