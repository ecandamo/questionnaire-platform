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
  PaperclipIcon,
  SaveIcon,
  SendIcon,
  XIcon,
} from "lucide-react"
import { upload } from "@vercel/blob/client"
import { toast } from "sonner"
import { ApiLogo } from "@/components/shared/api-logo"
import { CollaboratorPanel } from "@/components/shared/collaborator-panel"
import { answerableDisplayNumbers } from "@/lib/question-sections"
import { fileLabelFromBlobUrl } from "@/lib/blob-url-label"

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

function isLikelyValidEmail(raw: string): boolean {
  const s = raw.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
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
  const [markedComplete, setMarkedComplete] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [viewerRole, setViewerRole] = React.useState<ViewerRole>("owner")
  const [responseId, setResponseId] = React.useState<string | null>(null)
  /** Owner-only: who last saved each answer (from API + optimistic updates) */
  const [attributionByQuestionId, setAttributionByQuestionId] = React.useState<Record<string, string>>({})
  // All questions (unfiltered) used by CollaboratorPanel for assignment picker
  const [allQuestions, setAllQuestions] = React.useState<Question[]>([])

  /** Ref keeps latest answers for immediate post-upload / post-remove saves (avoids stale closure vs 30s autosave). */
  const answersRef = React.useRef<Record<string, string>>({})
  React.useEffect(() => {
    answersRef.current = answers
  }, [answers])

  React.useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/share/${token}`, { signal: controller.signal })
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
        setSubmitted(data.responseStatus === "submitted")
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
        if (e.name === "AbortError") return
        setError(e.message)
        setLoading(false)
      })
    return () => controller.abort()
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
    setSubmitted(data.responseStatus === "submitted")
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

  const persistAnswersSnapshot = React.useCallback(
    async (snapshot: Record<string, string>, showToast: boolean): Promise<boolean> => {
      if (!questionnaire) return false
      setSaving(true)
      const res = await fetch(`/api/responses/${questionnaire.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          answers: Object.entries(snapshot).map(([questionId, value]) => ({ questionId, value })),
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
        setSaving(false)
        return true
      }
      if (showToast) toast.error("Failed to save")
      else toast.error("Could not save your file change. Try again.")
      setSaving(false)
      return false
    },
    [questionnaire, token, respondentName, respondentEmail, viewerRole, responseId],
  )

  async function handleSave(showToast = true) {
    await persistAnswersSnapshot(answers, showToast)
  }

  const persistFileAnswerValue = React.useCallback(
    async (questionId: string, nextValue: string) => {
      if (!questionnaire || submitted || markedComplete) return
      const snap = { ...answersRef.current, [questionId]: nextValue }
      answersRef.current = snap
      await persistAnswersSnapshot(snap, false)
    },
    [questionnaire, submitted, markedComplete, persistAnswersSnapshot],
  )

  // Autosave every 30 seconds if there are answers (uses ref so we do not depend on `handleSave` / stale snapshots)
  React.useEffect(() => {
    if (!questionnaire || submitted || markedComplete) return
    const interval = setInterval(() => {
      const snap = answersRef.current
      if (Object.keys(snap).length > 0) {
        void persistAnswersSnapshot(snap, false)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [questionnaire, submitted, markedComplete, persistAnswersSnapshot])

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

    const nameOk = respondentName.trim().length > 0
    const emailOk = respondentEmail.trim().length > 0 && isLikelyValidEmail(respondentEmail)
    if (!nameOk || !emailOk) {
      toast.error("Name and email must be completed before submitting responses.")
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
        // Owner submitted — go straight to confirmation. Do not set `submitted` here:
        // that branch renders "Already Submitted" and would flash before navigation.
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
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading questionnaire">
        <Loader2Icon className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4 rounded-2xl border border-border/80 bg-card/90 p-8 shadow-card">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ClipboardListIcon className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Link Unavailable</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4 rounded-2xl border border-border/80 bg-card/90 p-8 shadow-card">
          <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2Icon className="h-7 w-7 text-success" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Already Submitted</h1>
          <p className="text-muted-foreground text-sm">
            This questionnaire has already been submitted. Thank you!
          </p>
        </div>
      </div>
    )
  }

  if (markedComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4 rounded-2xl border border-border/80 bg-card/90 p-8 shadow-card">
          <div className="h-14 w-14 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center mx-auto">
            <CheckCircle2Icon className="h-7 w-7 text-accent" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Section Complete</h1>
          <p className="text-muted-foreground text-sm">
            Thank you! Your answers have been saved. The questionnaire owner will handle final submission.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Sticky header — matches confirmation page: API navy bar + white wordmark */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-sidebar text-sidebar-foreground">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-stretch gap-2.5">
              {/* Same order + typography as dashboard sidebar brand row */}
              <div className="flex shrink-0 items-center gap-0 self-center">
                <ApiLogo variant="white" className="h-6 w-[88px] shrink-0" />
                <span className="min-w-0 -translate-x-4 text-[8.5px] font-bold uppercase leading-[1.15] tracking-[0.1em] text-sidebar-primary sm:text-[9px] sm:tracking-[0.11em]">
                  <span className="block">Client</span>
                  <span className="block">Questionnaires</span>
                </span>
              </div>
              <div className="w-px shrink-0 bg-white/10 self-stretch min-h-[2.5rem]" aria-hidden />
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{questionnaire?.title}</p>
                {questionnaire?.clientName && (
                  <p className="text-xs leading-tight text-white/50">{questionnaire.clientName}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {viewerRole === "contributor" && (
                <Badge
                  variant="secondary"
                  className="hidden border-0 bg-sidebar-primary/20 text-[10px] text-sidebar-primary px-1.5 sm:inline-flex"
                >
                  Contributor
                </Badge>
              )}
              <div className="hidden items-center gap-2.5 sm:flex">
                <Progress
                  value={progress}
                  className="h-2 w-28 bg-white/15 [&_[data-slot=progress-indicator]]:bg-sidebar-primary"
                />
                <span className="text-xs font-medium tabular-nums text-white/70">{progress}%</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="h-10 border-white/15 bg-white/5 text-sidebar-foreground hover:bg-white/10"
              >
                {saving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
          <Progress
            value={progress}
            className="mt-2.5 h-1.5 bg-white/15 sm:hidden [&_[data-slot=progress-indicator]]:bg-sidebar-primary"
          />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Respondent info */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 border-b border-border">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Your Information
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Name and email must be completed before submitting responses.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">
                Your Name
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              </Label>
              <Input
                id="name"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">
                Your Email
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              </Label>
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
          <div className="rounded-lg border border-primary/15 bg-gradient-to-r from-info-muted/80 to-secondary/10 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              You&apos;ve been assigned specific questions to answer. Confirm your name and email above, then click
              &quot;Mark Complete&quot; when you&apos;re done.
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
              persistFileAnswerValue={persistFileAnswerValue}
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
            {(!respondentName.trim() || !isLikelyValidEmail(respondentEmail)) && (
              <p className="text-destructive">
                Name and email must be completed before submitting responses.
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

function FileUploadQuestionInput({
  value,
  onChange,
  onPersistNewValue,
  labelId,
}: {
  value: string
  onChange: (v: string) => void
  /** Persist to server right after upload or remove so other viewers (e.g. collaborators) see the same state. */
  onPersistNewValue?: (next: string) => void | Promise<void>
  /** ID of the question label element for aria-labelledby on the file trigger. */
  labelId?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    setUploading(true)
    setProgress(0)
    try {
      const safe = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180) || "upload"
      const pathname = `respond-uploads/${Date.now()}-${safe}`
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob",
        multipart: file.size > 90 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.round(percentage))
        },
      })
      onChange(blob.url)
      await onPersistNewValue?.(blob.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function clear() {
    setError(null)
    onChange("")
    void onPersistNewValue?.("")
  }

  const label = value ? fileLabelFromBlobUrl(value) : ""

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,application/pdf,text/csv"
        onChange={onPick}
        disabled={uploading}
      />
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium truncate min-w-0 flex-1"
          >
            {label}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={clear}
            aria-label="Remove file"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full max-w-sm justify-center border-dashed"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          aria-labelledby={labelId}
        >
          {uploading ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
              Uploading{progress > 0 ? ` ${progress}%` : ""}…
            </>
          ) : (
            <>
              <PaperclipIcon className="h-4 w-4 mr-2 opacity-70" />
              Choose file
            </>
          )}
        </Button>
      )}
      {uploading && (
        <Progress value={Math.max(progress, 8)} className="h-1 max-w-sm" />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        PDF, Word, Excel, CSV, or image (PNG, JPG, GIF, WebP). Max 50 MB. Files upload directly to secure storage.
      </p>
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
  persistFileAnswerValue,
}: {
  question: Question
  displayNumber: number | null
  value: string
  onChange: (v: string) => void
  onToggleMulti: (option: string) => void
  showAttribution?: boolean
  answeredByLabel?: string
  persistFileAnswerValue?: (questionId: string, nextValue: string) => void | Promise<void>
}) {
  if (question.type === "section_header") {
    return (
      <div className="pt-8 pb-1">
        <h2 className="font-heading text-base font-semibold text-foreground">{question.text}</h2>
        {question.description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{question.description}</p>
        )}
        <div className="h-px bg-border mt-3" />
      </div>
    )
  }

  const selectedMulti = value ? value.split(",").filter(Boolean) : []

  return (
    <Card className="shadow-card">
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
              <p id={`qlabel-${question.id}`} className="text-sm font-medium leading-snug">
                {question.text}
                {question.isRequired && <span className="text-destructive ml-1 font-normal" aria-hidden>*</span>}
                {question.isRequired && <span className="sr-only">(required)</span>}
              </p>
              {question.description && (
                <p id={`qdesc-${question.id}`} className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{question.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ml-6">
          {question.type === "short_text" && (
            <Input
              aria-labelledby={`qlabel-${question.id}`}
              aria-describedby={question.description ? `qdesc-${question.id}` : undefined}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer..."
            />
          )}

          {question.type === "long_text" && (
            <Textarea
              aria-labelledby={`qlabel-${question.id}`}
              aria-describedby={question.description ? `qdesc-${question.id}` : undefined}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer..."
              rows={4}
            />
          )}

          {(question.type === "number" || question.type === "currency" || question.type === "percentage") && (
            <div className="flex items-center gap-2">
              {question.type === "currency" && (
                <span className="text-sm text-muted-foreground" aria-hidden>$</span>
              )}
              <Input
                type="number"
                aria-labelledby={`qlabel-${question.id}`}
                aria-describedby={question.description ? `qdesc-${question.id}` : undefined}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                className="max-w-48"
              />
              {question.type === "percentage" && (
                <span className="text-sm text-muted-foreground" aria-hidden>%</span>
              )}
            </div>
          )}

          {question.type === "date" && (
            <Input
              type="date"
              aria-labelledby={`qlabel-${question.id}`}
              aria-describedby={question.description ? `qdesc-${question.id}` : undefined}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="max-w-48"
            />
          )}

          {question.type === "yes_no" && (
            <div role="group" aria-labelledby={`qlabel-${question.id}`} className="flex gap-3">
              {["Yes", "No"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(value === opt ? "" : opt)}
                  aria-pressed={value === opt}
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
              <SelectTrigger aria-labelledby={`qlabel-${question.id}`}>
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
            <div role="group" aria-labelledby={`qlabel-${question.id}`} className="space-y-2">
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

          {question.type === "file_upload" && (
            <FileUploadQuestionInput
              labelId={`qlabel-${question.id}`}
              value={value}
              onChange={onChange}
              onPersistNewValue={(next) => void persistFileAnswerValue?.(question.id, next)}
            />
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
