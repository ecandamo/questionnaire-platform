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
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/types"
import { ApiLogo } from "@/components/shared/api-logo"

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
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)

  React.useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error ?? "Link invalid") })
        return r.json()
      })
      .then((data) => {
        setQuestionnaire(data.questionnaire)
        setQuestions(data.questions)
        if (data.responseStatus === "submitted") {
          setSubmitted(true)
        }
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [token])

  // Autosave every 30 seconds if there are answers
  React.useEffect(() => {
    if (!questionnaire || submitted) return
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        handleSave(false)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [questionnaire, answers, submitted])

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
      setLastSaved(new Date())
      if (showToast) toast.success("Progress saved")
    } else {
      if (showToast) toast.error("Failed to save")
    }
    setSaving(false)
  }

  async function handleSubmit() {
    if (!questionnaire) return

    // Validate required fields
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
      setSubmitted(true)
      router.push(`/respond/${token}/confirmation`)
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Submission failed")
    }
    setSaving(false)
    setShowSubmitConfirm(false)
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function toggleMultiSelect(questionId: string, option: string) {
    const current = answers[questionId] ? answers[questionId].split(",").filter(Boolean) : []
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option]
    setAnswer(questionId, updated.join(","))
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

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuestionField
              key={q.id}
              question={q}
              index={idx + 1}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswer(q.id, v)}
              onToggleMulti={(o) => toggleMultiSelect(q.id, o)}
            />
          ))}
        </div>

        {/* Submit */}
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
            Submit Questionnaire
          </Button>
        </div>
      </div>

      {/* Submit Confirm */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Questionnaire?</DialogTitle>
            <DialogDescription>
              Once submitted, you will not be able to make changes unless the questionnaire is reopened by the owner.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-1 py-2">
            <p>
              <span className="font-medium text-foreground">{answered}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> questions answered
            </p>
            {questions.filter(q => q.isRequired && !answers[q.id]?.trim()).length > 0 && (
              <p className="text-destructive">
                {questions.filter(q => q.isRequired && !answers[q.id]?.trim()).length} required question(s) unanswered
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              Go Back
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Yes, Submit
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
  index,
  value,
  onChange,
  onToggleMulti,
}: {
  question: Question
  index: number
  value: string
  onChange: (v: string) => void
  onToggleMulti: (option: string) => void
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
            <span className="font-mono text-[10px] text-muted-foreground/50 mt-1 shrink-0 w-4 text-right tabular-nums">{index}.</span>
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
      </CardContent>
    </Card>
  )
}
