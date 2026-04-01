"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
} from "lucide-react"
import { toast } from "sonner"
import { ApiLogo } from "@/components/shared/api-logo"
import { CollaboratorPanel } from "@/components/shared/collaborator-panel"
import { answerableDisplayNumbers } from "@/lib/question-sections"

interface Question {
  id: string
  text: string
  type: string
  description: string | null
  options: string[] | null
  isRequired: boolean
  sortOrder: number
}

interface QData {
  id: string
  title: string
  type: string
  clientName: string | null
}

type ViewerRole = "owner" | "contributor"

export default function RespondPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [questionnaire, setQuestionnaire] = React.useState<QData | null>(null)
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [respondentName, setRespondentName] = React.useState("")
  const [respondentEmail, setRespondentEmail] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [markedComplete, setMarkedComplete] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [viewerRole, setViewerRole] = React.useState<ViewerRole>("owner")
  const [responseId, setResponseId] = React.useState<string | null>(null)
  /** Owner-only: who last saved each answer (from API + optimistic updates) */
  const [attributionByQuestionId, setAttributionByQuestionId] = React.useState<Record<string, string>>({})
  // All questions (unfiltered) used by CollaboratorPanel for assignment picker
  const [allQuestions, setAllQuestions] = React.useState<Question[]>([])

  React.useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error ?? "Link invalid") })
        return r.json()
      })
      .then((data) => {
        setQuestionnaire(data.questionnaire)
        setQuestions(data.questions)
        setAllQuestions(data.questions)
        setViewerRole(data.viewerRole ?? "owner")
        setResponseId(data.responseId ?? null)
        if (data.responseStatus === "submitted") {
          setSubmitted(true)
        }
        const initialAnswers: Record<string, string> = {}
        const attr: Record<string, string> = {}
        for (const row of data.answers ?? []) {
          initialAnswers[row.questionId] = row.value ?? ""
          if (data.viewerRole === "owner" && row.answeredByLabel) {
            attr[row.questionId] = row.answeredByLabel
          }
        }
        setAnswers(initialAnswers)
        setAttributionByQuestionId(attr)
        // Pre-fill collaborator name/email if available
        if (data.collaboratorName) setRespondentName(data.collaboratorName)
        if (data.collaboratorEmail) setRespondentEmail(data.collaboratorEmail)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [token])

  const questionDisplayNumbers = React.useMemo(
    () => answerableDisplayNumbers(questions),
    [questions]
  )

  /** Re-sync form + progress from DB after team changes (e.g. collaborator removed → answers deleted). */
  const refreshShareSnapshot = React.useCallback(async () => {
    const r = await fetch(`/api/share/${token}`)
    if (!r.ok) return
    const data = await r.json()
    setQuestionnaire(data.questionnaire)
    setQuestions(data.questions)
    setAllQuestions(data.questions)
    setResponseId(data.responseId ?? null)
    if (data.responseStatus === "submitted") {
      setSubmitted(true)
    }
    const nextAnswers: Record<string, string> = {}
    for (const row of data.answers ?? []) {
      nextAnswers[row.questionId] = row.value ?? ""
    }
    setAnswers(nextAnswers)
    const nextAttr: Record<string, string> = {}
    for (const row of data.answers ?? []) {
      if (data.viewerRole === "owner" && row.answeredByLabel) {
        nextAttr[row.questionId] = row.answeredByLabel
      }
    }
    setAttributionByQuestionId(nextAttr)
  }, [token])

  async function handleSave(showToast = true) {
    if (!questionnaire) return
    setSaving(true)
    const res = await fetch(`/api/responses/${questionnaire.id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        respondentName: respondentName || undefined,
        respondentEmail: respondentEmail || undefined,
        submit: false,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.responseId && !responseId) setResponseId(data.responseId)
      if (viewerRole === "owner") {
        const r2 = await fetch(`/api/share/${token}`)
        if (r2.ok) {
          const fresh = await r2.json()
          const nextAttr: Record<string, string> = {}
          for (const row of fresh.answers ?? []) {
            if (row.answeredByLabel) nextAttr[row.questionId] = row.answeredByLabel
          }
          setAttributionByQuestionId(nextAttr)
        }
      }
      setLastSaved(new Date())
      if (showToast) toast.success("Progress saved")
    } else {
      if (showToast) toast.error("Failed to save")
    }
    setSaving(false)
  }

  // Autosave every 30 seconds if there are answers
  React.useEffect(() => {
    if (!questionnaire || submitted || markedComplete) return
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        void handleSave(false)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [questionnaire, answers, submitted, markedComplete])

  async function handleSubmit() {
    if (!questionnaire) return

    // Validate required fields for questions visible to this viewer
    const requiredMissing = questions.filter(
      (q) => q.isRequired && q.type !== "section_header" && !answers[q.id]?.trim()
    )
    if (requiredMissing.length > 0) {
      toast.error(`Please answer all required questions (${requiredMissing.length} remaining)`)
      setShowSubmitConfirm(false)
      return
    }

    setSaving(true)
    const res = await fetch(`/api/responses/${questionnaire.id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        respondentName: respondentName || undefined,
        respondentEmail: respondentEmail || undefined,
        submit: true,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.markedComplete) {
        // Contributor finished their questions
        setMarkedComplete(true)
      } else {
        // Owner submitted the whole questionnaire
        setSubmitted(true)
        router.push(`/respond/${token}/confirmation`)
      }
    } else {
      const err = await res.json()
      if (err.collaboratorIncomplete) {
        toast.error(err.error, { duration: 5000 })
      } else {
        toast.error(err.error ?? "Submission failed")
      }
    }
    setSaving(false)
    setShowSubmitConfirm(false)
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    if (viewerRole === "owner") {
      setAttributionByQuestionId((prev) => ({
        ...prev,
        [questionId]: "Primary respondent",
      }))
    }
  }

  function toggleMultiSelect(questionId: string, option: string) {
    const current = answers[questionId] ? answers[questionId].split(",").filter(Boolean) : []
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option]
    const next = updated.join(",")
    setAnswers((prev) => ({ ...prev, [questionId]: next }))
    if (viewerRole === "owner") {
      setAttributionByQuestionId((prev) => ({
        ...prev,
        [questionId]: "Primary respondent",
      }))
    }
  }

  const answered = questions.filter(
    (q) => q.type !== "section_header" && answers[q.id]?.trim()
  ).length
  const total = questions.filter((q) => q.type !== "section_header").length
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ClipboardListIcon className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Link Unavailable</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2Icon className="h-7 w-7 text-success" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Already Submitted</h1>
          <p className="text-muted-foreground text-sm">
            This questionnaire has already been submitted. Thank you!
          </p>
        </div>
      </div>
    )
  }

  if (markedComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="h-14 w-14 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center mx-auto">
            <CheckCircle2Icon className="h-7 w-7 text-[color:var(--accent)]" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Section Complete</h1>
          <p className="text-muted-foreground text-sm">
            Thank you! Your answers have been saved. The questionnaire owner will handle final submission.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Sticky header with progress */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <ApiLogo variant="navy" className="w-14 shrink-0" />
              <div className="w-px h-7 bg-border shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{questionnaire?.title}</p>
                {questionnaire?.clientName && (
                  <p className="text-xs text-muted-foreground leading-tight">{questionnaire.clientName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {viewerRole === "contributor" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 hidden sm:inline-flex">
                  Contributor
                </Badge>
              )}
              <div className="hidden sm:flex items-center gap-2.5">
                <Progress value={progress} className="w-28 h-2" />
                <span className="text-xs font-medium text-muted-foreground tabular-nums">{progress}%</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="h-8"
              >
                {saving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-2.5 h-1.5 sm:hidden" />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Respondent info */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 border-b border-border">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Your Information</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">Your Name</Label>
              <Input
                id="name"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Your Email</Label>
              <Input
                id="email"
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                placeholder="jane@company.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team panel — owner only (response row is created on first share load) */}
        {viewerRole === "owner" && questionnaire && responseId && (
          <CollaboratorPanel
            responseId={responseId}
            ownerToken={token}
            questionnaireTitle={questionnaire.title}
            questions={allQuestions}
            onTeamChanged={refreshShareSnapshot}
          />
        )}

        {/* Contributor hint */}
        {viewerRole === "contributor" && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              You&apos;ve been assigned specific questions to answer. Once done, click &quot;Mark Complete&quot; below.
            </p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              displayNumber={
                q.type === "section_header"
                  ? null
                  : (questionDisplayNumbers.get(q.id) ?? null)
              }
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswer(q.id, v)}
              onToggleMulti={(o) => toggleMultiSelect(q.id, o)}
              showAttribution={viewerRole === "owner"}
              answeredByLabel={attributionByQuestionId[q.id]}
            />
          ))}
        </div>

        {/* Submit / Mark Complete */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {lastSaved ? (
            <p className="text-xs text-muted-foreground">
              Saved at {lastSaved.toLocaleTimeString()}
            </p>
          ) : (
            <div />
          )}
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={saving}
            size="lg"
            className="gap-2"
          >
            <SendIcon className="h-4 w-4" />
            {viewerRole === "contributor" ? "Mark Complete" : "Submit Questionnaire"}
          </Button>
        </div>
      </div>

      {/* Submit / Mark Complete Confirm */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {viewerRole === "contributor" ? "Mark Your Section Complete?" : "Submit Questionnaire?"}
            </DialogTitle>
            <DialogDescription>
              {viewerRole === "contributor"
                ? "This will save your answers and notify the questionnaire owner that your section is done."
                : "Once submitted, you will not be able to make changes unless the questionnaire is reopened by the owner."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-1 py-2">
            <p>
              <span className="font-medium text-foreground">{answered}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> questions answered
            </p>
            {questions.filter(
              (q) =>
                q.type !== "section_header" && q.isRequired && !answers[q.id]?.trim()
            ).length > 0 && (
              <p className="text-destructive">
                {
                  questions.filter(
                    (q) =>
                      q.type !== "section_header" &&
                      q.isRequired &&
                      !answers[q.id]?.trim()
                  ).length
                }{" "}
                required question(s) unanswered
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              Go Back
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {viewerRole === "contributor" ? "Yes, Mark Complete" : "Yes, Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Question Field Component ─────────────────────────────────────────────────

function QuestionField({
  question,
  displayNumber,
  value,
  onChange,
  onToggleMulti,
  showAttribution,
  answeredByLabel,
}: {
  question: Question
  displayNumber: number | null
  value: string
  onChange: (v: string) => void
  onToggleMulti: (option: string) => void
  showAttribution?: boolean
  answeredByLabel?: string
}) {
  if (question.type === "section_header") {
    return (
      <div className="pt-6 pb-2">
        <div className="border-l-2 border-primary pl-4">
          <h2 className="font-heading text-base font-semibold text-foreground">{question.text}</h2>
          {question.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{question.description}</p>
          )}
        </div>
      </div>
    )
  }

  const selectedMulti = value ? value.split(",").filter(Boolean) : []

  return (
    <Card className={`shadow-card transition-all ${question.isRequired ? "border-l-2 border-l-primary/20" : ""}`}>
      <CardContent className="pt-4 space-y-3">
        <div>
          <div className="flex items-start gap-2.5">
            {displayNumber != null ? (
              <span className="font-mono text-[10px] text-muted-foreground/50 mt-1 shrink-0 w-4 text-right tabular-nums">
                {displayNumber}.
              </span>
            ) : (
              <span className="mt-1 shrink-0 w-4" aria-hidden />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium leading-snug">
                {question.text}
                {question.isRequired && <span className="text-destructive ml-1 font-normal">*</span>}
              </p>
              {question.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{question.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ml-6">
          {question.type === "short_text" && (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer..."
            />
          )}

          {question.type === "long_text" && (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer..."
              rows={4}
            />
          )}

          {(question.type === "number" || question.type === "currency" || question.type === "percentage") && (
            <div className="flex items-center gap-2">
              {question.type === "currency" && (
                <span className="text-sm text-muted-foreground">$</span>
              )}
              <Input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                className="max-w-48"
              />
              {question.type === "percentage" && (
                <span className="text-sm text-muted-foreground">%</span>
              )}
            </div>
          )}

          {question.type === "date" && (
            <Input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="max-w-48"
            />
          )}

          {question.type === "yes_no" && (
            <div className="flex gap-3">
              {["Yes", "No"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChange(value === opt ? "" : opt)}
                  className={`flex-1 max-w-28 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    value === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {question.type === "single_select" && question.options && (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {question.type === "multi_select" && question.options && (
            <div className="space-y-2">
              {question.options.map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox
                    id={`${question.id}-${opt}`}
                    checked={selectedMulti.includes(opt)}
                    onCheckedChange={() => onToggleMulti(opt)}
                  />
                  <Label
                    htmlFor={`${question.id}-${opt}`}
                    className="font-normal cursor-pointer text-sm"
                  >
                    {opt}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAttribution && answeredByLabel && value.trim() && (
          <p className="ml-6 text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1">
            <span className="h-1 w-1 rounded-full bg-[color:var(--accent)] shrink-0" />
            <span>
              Last updated by <span className="font-medium text-foreground/80">{answeredByLabel}</span>
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
