"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeftIcon, DownloadIcon, Loader2Icon } from "lucide-react"
import { format } from "date-fns"
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/types"
import { answerableDisplayNumbers } from "@/lib/question-sections"

interface Question {
  id: string
  text: string
  type: string
  isRequired: boolean
  isHidden: boolean
  sortOrder: number
}

interface Answer {
  id: string
  questionId: string
  value: string | null
}

interface ResponseData {
  id: string
  status: string
  respondentName: string | null
  respondentEmail: string | null
  submittedAt: string | null
  createdAt: string
}

export default function ResponsesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [loading, setLoading] = React.useState(true)
  const [responseData, setResponseData] = React.useState<ResponseData | null>(null)
  const [answers, setAnswers] = React.useState<Answer[]>([])
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [questionnaireTitle, setQuestionnaireTitle] = React.useState("")

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/responses/${id}`).then((r) => r.json()),
      fetch(`/api/questionnaires/${id}`).then((r) => r.json()),
    ]).then(([respData, q]) => {
      setResponseData(respData.response)
      setAnswers(respData.answers ?? [])
      setQuestions(respData.questions ?? [])
      setQuestionnaireTitle(q.title ?? "")
      setLoading(false)
    })
  }, [id])

  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]))
  const visibleQuestions = React.useMemo(
    () =>
      [...questions.filter((q) => !q.isHidden)].sort((a, b) => a.sortOrder - b.sortOrder),
    [questions]
  )
  const displayNumbers = React.useMemo(
    () => answerableDisplayNumbers(visibleQuestions),
    [visibleQuestions]
  )
  const answerableVisible = React.useMemo(
    () => visibleQuestions.filter((q) => q.type !== "section_header"),
    [visibleQuestions]
  )
  const answeredAnswerableCount = React.useMemo(
    () =>
      answerableVisible.filter((q) => {
        const row = answers.find((a) => a.questionId === q.id)
        const v = row?.value
        return v != null && String(v).trim() !== ""
      }).length,
    [answerableVisible, answers]
  )

  function handleExport() {
    window.open(`/api/responses/${id}/export`, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Responses</h1>
            <p className="text-sm text-muted-foreground">{questionnaireTitle}</p>
          </div>
        </div>
        {responseData && (
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {!responseData ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No responses yet. Share the questionnaire link to collect responses.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Respondent Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium mt-0.5">{responseData.respondentName ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium mt-0.5">{responseData.respondentEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge
                  variant="outline"
                  className={responseData.status === "submitted"
                    ? "bg-success/10 text-success border-success/20 mt-0.5"
                    : "bg-warning/10 text-warning border-warning/20 mt-0.5"
                  }
                >
                  {responseData.status === "submitted" ? "Submitted" : "In Progress"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Submitted At</p>
                <p className="font-medium mt-0.5">
                  {responseData.submittedAt
                    ? format(new Date(responseData.submittedAt), "MMM d, yyyy HH:mm")
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-base">Answers</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {answeredAnswerableCount} / {answerableVisible.length} answered
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleQuestions.map((q, idx) => {
                if (q.type === "section_header") {
                  return (
                    <div key={q.id}>
                      {idx > 0 && <Separator className="mb-4" />}
                      <div className="space-y-1 pt-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Section
                        </p>
                        <p className="text-sm font-semibold">{q.text}</p>
                      </div>
                    </div>
                  )
                }

                const value = answerMap.get(q.id)
                const num = displayNumbers.get(q.id)
                return (
                  <div key={q.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        {num != null ? (
                          <span className="text-xs text-muted-foreground mt-0.5 shrink-0 tabular-nums">
                            {num}.
                          </span>
                        ) : (
                          <span className="w-4 shrink-0" aria-hidden />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {QUESTION_TYPE_LABELS[q.type as QuestionType] ?? q.type}
                            </Badge>
                            {q.isRequired && (
                              <span className="text-xs text-muted-foreground">Required</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-5">
                        {value ? (
                          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                            {value}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No answer</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
