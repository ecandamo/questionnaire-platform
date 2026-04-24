"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { QuestionnairStatusBadge } from "@/components/shared/status-badge"
import {
  ArrowLeftIcon,
  GripVerticalIcon,
  PlusIcon,
  EyeOffIcon,
  EyeIcon,
  Loader2Icon,
  Share2Icon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  SearchIcon,
  SaveIcon,
  SendIcon,
  ExternalLinkIcon,
  UsersIcon,
  MailIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react"
import { toast } from "sonner"
import { addDays, format } from "date-fns"
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES_WITH_OPTIONS,
  type QuestionnaireStatus,
  type QuestionType,
} from "@/types"
import { answerableDisplayNumbers } from "@/lib/question-sections"
import { QuestionAssignmentPicker } from "@/components/shared/question-assignment-picker"
import { useDashboardTitle } from "@/components/layout/dashboard-title-context"

/** Client-side id for new rows; must be a real UUID — `questionnaire_question.id` is a Postgres uuid column. */
function newClientQuestionId(): string {
  return globalThis.crypto.randomUUID()
}

function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      e instanceof DOMException &&
      e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  )
}

interface QQuestion {
  id: string
  text: string
  type: string
  description: string | null
  options: string[] | null
  isRequired: boolean
  isHidden: boolean
  sortOrder: number
  isCustom: boolean
  sourceQuestionId: string | null
}

interface BankQuestion {
  id: string
  text: string
  type: string
  categoryName: string | null
  isRequired: boolean
  options: string[] | null
}

interface QuestionnaireDetail {
  id: string
  title: string
  type: string
  status: string
  clientName: string | null
  ownerName: string | null
  ownerId: string
  publishedAt: string | null
  submittedAt: string | null
  questions: QQuestion[]
  shareUrl?: string | null
}

interface Props {
  id: string
  isAdmin: boolean
  currentUserId: string
  typeLabels: Record<string, string>
}

export function QuestionnaireDetailClient({ id, isAdmin, currentUserId, typeLabels }: Props) {
  const router = useRouter()
  const { setOverride } = useDashboardTitle()
  const [data, setData] = React.useState<QuestionnaireDetail | null>(null)
  const [questions, setQuestions] = React.useState<QQuestion[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [showAddCustom, setShowAddCustom] = React.useState(false)
  const [showBankPicker, setShowBankPicker] = React.useState(false)
  const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([])
  const [bankSearch, setBankSearch] = React.useState("")
  const [bankLoading, setBankLoading] = React.useState(false)
  const [expiryDays, setExpiryDays] = React.useState(30)
  const [expiryPreview, setExpiryPreview] = React.useState("")

  React.useEffect(() => {
    setExpiryPreview(format(addDays(new Date(), expiryDays), "MMM d, yyyy"))
  }, [expiryDays])

  React.useEffect(() => {
    if (!data) return
    const subtitle = [
      typeLabels[data.type],
      data.clientName,
    ]
      .filter(Boolean)
      .join(" · ")
    setOverride({
      title: data.title,
      subtitle: subtitle || undefined,
    })
    return () => setOverride(null)
  }, [data, setOverride, typeLabels])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const questionDisplayNumbers = React.useMemo(
    () => answerableDisplayNumbers(questions),
    [questions]
  )

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/questionnaires/${id}`, { signal })
      if (signal?.aborted) return
      if (!res.ok) {
        router.push("/questionnaires")
        return
      }
      const d = await res.json()
      if (signal?.aborted) return
      setData(d)
      setQuestions(d.questions.sort((a: QQuestion, b: QQuestion) => a.sortOrder - b.sortOrder))
      setShareUrl(d.shareUrl ?? null)
      setLoading(false)
    } catch (e) {
      if (signal?.aborted || isAbortError(e)) return
      setLoading(false)
    }
  }, [id, router])

  React.useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  /** Persists the current `questions` list to the server (draft PATCH). */
  async function persistQuestionsToServer(): Promise<{ ok: true } | { ok: false; error: string }> {
    const res = await fetch(`/api/questionnaires/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: questions.map((q, i) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          description: q.description,
          options: q.options,
          isRequired: q.isRequired,
          isHidden: q.isHidden,
          sortOrder: i,
          isCustom: q.isCustom,
          sourceQuestionId: q.sourceQuestionId,
        })),
      }),
    })
    if (res.ok) return { ok: true }
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : `Save failed (${res.status})`,
    }
  }

  async function handleSave() {
    setSaving(true)
    const result = await persistQuestionsToServer()
    if (result.ok) {
      toast.success("Draft saved")
      await load()
    } else {
      toast.error(result.error)
    }
    setSaving(false)
  }

  async function handlePublish() {
    setPublishing(true)
    // Publish does not send questions — custom / edited drafts only exist in React state until Save.
    // Always persist the current list first so the share link sees the same questions as the builder.
    const saveResult = await persistQuestionsToServer()
    if (!saveResult.ok) {
      toast.error(saveResult.error)
      setPublishing(false)
      return
    }

    const res = await fetch(`/api/questionnaires/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiryDays }),
    })
    if (res.ok) {
      const data = await res.json()
      setShareUrl(data.shareUrl)
      toast.success("Published! Share link generated.")
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to publish")
    }
    setPublishing(false)
  }

  async function handleReopen() {
    const res = await fetch(`/api/questionnaires/${id}/reopen`, { method: "POST" })
    if (res.ok) {
      toast.success("Questionnaire reopened")
      load()
    } else {
      toast.error("Failed to reopen")
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const loadBankQuestions = React.useCallback(async (signal?: AbortSignal) => {
    setBankLoading(true)
    try {
      const params = new URLSearchParams({ status: "active" })
      if (bankSearch) params.set("search", bankSearch)
      const res = await fetch(`/api/questions?${params}`, { signal })
      if (signal?.aborted) return
      if (res.ok) setBankQuestions(await res.json())
    } catch (e) {
      if (signal?.aborted || isAbortError(e)) return
    } finally {
      if (!signal?.aborted) setBankLoading(false)
    }
  }, [bankSearch])

  React.useEffect(() => {
    if (!showBankPicker) return
    const controller = new AbortController()
    void loadBankQuestions(controller.signal)
    return () => controller.abort()
  }, [showBankPicker, loadBankQuestions])

  function addBankQuestion(bq: BankQuestion) {
    const already = questions.some((q) => q.sourceQuestionId === bq.id)
    if (already) {
      toast.error("This question is already in the questionnaire")
      return
    }
    const newQ: QQuestion = {
      id: newClientQuestionId(),
      text: bq.text,
      type: bq.type,
      description: null,
      options: bq.options,
      isRequired: bq.isRequired,
      isHidden: false,
      sortOrder: questions.length,
      isCustom: false,
      sourceQuestionId: bq.id,
    }
    setQuestions((prev) => [...prev, newQ])
    toast.success("Question added")
  }

  function addCustomQuestion(q: Omit<QQuestion, "id" | "sortOrder">) {
    const newQ: QQuestion = {
      ...q,
      id: newClientQuestionId(),
      sortOrder: questions.length,
    }
    setQuestions((prev) => [...prev, newQ])
  }

  function updateQuestion(qId: string, updates: Partial<QQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, ...updates } : q)))
  }

  function removeQuestion(qId: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== qId))
  }

  function copyShareUrl() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const canEdit = data.status === "draft"
  const isOwner = data.ownerId === currentUserId
  const canInteract = isOwner || isAdmin

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()} className="mt-1" aria-label="Go back">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <QuestionnairStatusBadge status={data.status as QuestionnaireStatus} />
            </div>
            {data.ownerName ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="text-muted-foreground/80">Owner</span> {data.ownerName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canEdit && canInteract && (
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
              Save Draft
            </Button>
          )}
          {data.status === "submitted" && canInteract && (
            <Button variant="outline" onClick={handleReopen}>
              Reopen
            </Button>
          )}
          {canEdit && canInteract && (
            <Button onClick={handlePublish} disabled={publishing || questions.filter(q => !q.isHidden).length === 0}>
              {publishing ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              Publish
            </Button>
          )}
          {["shared", "in_progress", "submitted"].includes(data.status) && (
            <Button variant="outline" asChild>
              <Link href={`/questionnaires/${id}/responses`}>
                View Responses
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Share Link Banner */}
      {shareUrl && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Share2Icon className="h-5 w-5 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-success">Questionnaire published!</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{shareUrl}</p>
              </div>
              <Button size="sm" variant="outline" onClick={copyShareUrl}>
                {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          {["shared", "in_progress", "submitted"].includes(data.status) && (
            <TabsTrigger value="share">Share Link</TabsTrigger>
          )}
          {["shared", "in_progress"].includes(data.status) && canInteract && (
            <TabsTrigger value="team">Team</TabsTrigger>
          )}
        </TabsList>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-4 mt-4">
          {canEdit && canInteract && (
            <div className="flex items-center gap-2 justify-between">
              <p className="text-sm text-muted-foreground">
                {questions.filter((q) => !q.isHidden).length} visible ·{" "}
                {questions.filter((q) => q.isRequired && !q.isHidden).length} required ·{" "}
                {questions.length} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowBankPicker(true)}>
                  <SearchIcon className="h-4 w-4" />
                  Add from Bank
                </Button>
                <Button size="sm" onClick={() => setShowAddCustom(true)}>
                  <PlusIcon className="h-4 w-4" />
                  Add Custom Question
                </Button>
              </div>
            </div>
          )}

          {!canEdit && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              This questionnaire has been published. The structure cannot be edited.
            </div>
          )}

          {questions.length === 0 && (
            <Card className="shadow-card border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center gap-3">
                <p className="text-sm text-muted-foreground">No questions yet</p>
                {canEdit && canInteract && (
                  <div className="flex flex-col items-center gap-3 max-w-md">
                    {data.type !== "custom" && (
                      <p className="text-xs text-muted-foreground">
                        Questions from the template appear here when present. You can also add from the
                        bank or create custom questions.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => setShowBankPicker(true)}>
                        <SearchIcon className="h-4 w-4" />
                        Add from Bank
                      </Button>
                      <Button size="sm" onClick={() => setShowAddCustom(true)}>
                        <PlusIcon className="h-4 w-4" />
                        Add Custom Question
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={canEdit ? handleDragEnd : () => {}}
          >
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {questions.map((q) => (
                  <SortableQuestionCard
                    key={q.id}
                    question={q}
                    displayIndex={
                      q.type === "section_header"
                        ? null
                        : (questionDisplayNumbers.get(q.id) ?? null)
                    }
                    canEdit={canEdit && canInteract}
                    onUpdate={(updates) => updateQuestion(q.id, updates)}
                    onRemove={() => removeQuestion(q.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expiry-days">Link Expiry (days)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="expiry-days"
                    type="number"
                    min={1}
                    max={365}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-28"
                    disabled={!canEdit}
                  />
                  <span className="text-sm text-muted-foreground">
                    Expires {expiryPreview || "—"}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="text-sm space-y-1">
                <p className="font-medium">Timeline</p>
                <p className="text-muted-foreground text-xs">
                  Created: {data.publishedAt ? format(new Date(data.publishedAt), "MMM d, yyyy HH:mm") : "—"}
                </p>
                {data.publishedAt && (
                  <p className="text-muted-foreground text-xs">
                    Published: {format(new Date(data.publishedAt), "MMM d, yyyy HH:mm")}
                  </p>
                )}
                {data.submittedAt && (
                  <p className="text-muted-foreground text-xs">
                    Submitted: {format(new Date(data.submittedAt), "MMM d, yyyy HH:mm")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Share Link Tab */}
        <TabsContent value="share" className="mt-4">
          <ShareLinkPanel shareUrl={shareUrl} />
        </TabsContent>

        {/* Team (Sender Assignments) Tab */}
        {["shared", "in_progress"].includes(data.status) && canInteract && (
          <TabsContent value="team" className="mt-4">
            <SenderAssignmentsPanel
              questionnaireId={id}
              questionnaireTitle={data.title}
              questions={questions.filter((q) => !q.isHidden)}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Custom Question Dialog */}
      <AddCustomQuestionDialog
        open={showAddCustom}
        onClose={() => setShowAddCustom(false)}
        onAdd={addCustomQuestion}
      />

      {/* Question Bank Picker */}
      <Dialog open={showBankPicker} onOpenChange={setShowBankPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add from Question Bank</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {bankLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : bankQuestions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No questions found</p>
            ) : (
              bankQuestions.map((bq) => {
                const alreadyAdded = questions.some((q) => q.sourceQuestionId === bq.id)
                return (
                  <div
                    key={bq.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{bq.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{QUESTION_TYPE_LABELS[bq.type as QuestionType]}</Badge>
                        {bq.categoryName && <span className="text-xs text-muted-foreground">{bq.categoryName}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyAdded ? "secondary" : "outline"}
                      onClick={() => addBankQuestion(bq)}
                      disabled={alreadyAdded}
                    >
                      {alreadyAdded ? <CheckIcon className="h-3 w-3" /> : <PlusIcon className="h-3 w-3" />}
                      {alreadyAdded ? "Added" : "Add"}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankPicker(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sortable Question Card ───────────────────────────────────────────────────

function SortableQuestionCard({
  question,
  displayIndex,
  canEdit,
  onUpdate,
  onRemove,
}: {
  question: QQuestion
  displayIndex: number | null
  canEdit: boolean
  onUpdate: (updates: Partial<QQuestion>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover ${question.isHidden ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2 p-4">
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center p-2 rounded-md cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors touch-none -ml-0.5"
            aria-label={`Drag to reorder: ${question.text}`}
          >
            <GripVerticalIcon className="h-4 w-4" aria-hidden />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5">
            {displayIndex != null ? (
              <span className="font-mono text-[10px] text-muted-foreground/50 mt-1 shrink-0 w-4 text-right tabular-nums">
                {displayIndex}.
              </span>
            ) : (
              <span className="mt-1 shrink-0 w-4" aria-hidden />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug text-foreground">{question.text}</p>
              {question.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{question.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="inline-flex items-center rounded-md bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {QUESTION_TYPE_LABELS[question.type as QuestionType] ?? question.type}
                </span>
                {question.isRequired && (
                  <span className="inline-flex items-center rounded-md bg-destructive/8 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    Required
                  </span>
                )}
                {question.isCustom && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Custom
                  </span>
                )}
                {question.isHidden && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Hidden
                  </span>
                )}
              </div>
              {question.type === "file_upload" && (
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Respondent uploads a file (PDF, Word, Excel, CSV, or image, up to 50 MB). Answers store a link to the file.
                </p>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onUpdate({ isHidden: !question.isHidden })}
              className="flex items-center justify-center p-2.5 rounded-md hover:bg-muted transition-colors text-muted-foreground/50 hover:text-foreground"
              aria-label={question.isHidden ? "Show question" : "Hide question"}
            >
              {question.isHidden ? <EyeIcon className="h-3.5 w-3.5" aria-hidden /> : <EyeOffIcon className="h-3.5 w-3.5" aria-hidden />}
            </button>
            <div className="flex items-center gap-1.5 ml-1.5 mr-1">
              <Switch
                checked={question.isRequired}
                onCheckedChange={(v) => onUpdate({ isRequired: v })}
                className="scale-75"
                aria-label={`Mark "${question.text}" as required`}
              />
              <span className="text-[10px] text-muted-foreground" aria-hidden>Req</span>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center justify-center p-2.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground/50 hover:text-destructive"
              aria-label={`Remove question: ${question.text}`}
            >
              <TrashIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add Custom Question Dialog ───────────────────────────────────────────────

function AddCustomQuestionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (q: Omit<QQuestion, "id" | "sortOrder">) => void
}) {
  const [text, setText] = React.useState("")
  const [type, setType] = React.useState<QuestionType>("short_text")
  const [description, setDescription] = React.useState("")
  const [isRequired, setIsRequired] = React.useState(false)
  const [options, setOptions] = React.useState("")

  function handleAdd() {
    if (!text.trim()) { toast.error("Question text is required"); return }
    const parsedOptions = QUESTION_TYPES_WITH_OPTIONS.includes(type)
      ? options.split("\n").map((o) => o.trim()).filter(Boolean)
      : null

    onAdd({
      text: text.trim(),
      type,
      description: description.trim() || null,
      options: parsedOptions,
      isRequired,
      isHidden: false,
      isCustom: true,
      sourceQuestionId: null,
    })
    setText("")
    setDescription("")
    setOptions("")
    setIsRequired(false)
    setType("short_text")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Custom Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-q-text">Question Text <span className="text-destructive" aria-hidden>*</span></Label>
            <Textarea
              id="custom-q-text"
              placeholder="Enter your question..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-q-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
              <SelectTrigger id="custom-q-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {QUESTION_TYPES_WITH_OPTIONS.includes(type) && (
            <div className="space-y-2">
              <Label htmlFor="custom-q-options">Options (one per line)</Label>
              <Textarea
                id="custom-q-options"
                placeholder="Option A&#10;Option B&#10;Option C"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="custom-q-desc">Description / Help Text</Label>
            <Input
              id="custom-q-desc"
              placeholder="Optional context for respondents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="required"
              checked={isRequired}
              onCheckedChange={(v) => setIsRequired(v === true)}
            />
            <Label htmlFor="required" className="font-normal cursor-pointer">Required</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!text.trim()}>
            <PlusIcon className="h-4 w-4" />
            Add Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sender Assignments Panel ─────────────────────────────────────────────────

interface SenderCollaborator {
  id: string
  email: string
  name: string | null
  token: string
  inviteStatus: "pending" | "active" | "completed"
  assignedCount: number
  answeredCount: number
  collaboratorUrl: string
}

function SenderAssignmentsPanel({
  questionnaireId,
  questionnaireTitle,
  questions,
}: {
  questionnaireId: string
  questionnaireTitle: string
  questions: QQuestion[]
}) {
  const [collaborators, setCollaborators] = React.useState<SenderCollaborator[]>([])
  const [loading, setLoading] = React.useState(true)
  const [responseExists, setResponseExists] = React.useState(false)
  const [showInvite, setShowInvite] = React.useState(false)
  const [inviting, setInviting] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteName, setInviteName] = React.useState("")
  const [selectedQuestions, setSelectedQuestions] = React.useState<Set<string>>(new Set())

  const fetchCollaborators = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/questionnaires/${questionnaireId}/collaborators`, { signal })
      if (signal?.aborted) return
      if (res.ok) {
        const data = await res.json()
        if (signal?.aborted) return
        setCollaborators(data.collaborators ?? [])
        setResponseExists(data.responseExists ?? false)
      }
    } catch (e) {
      if (signal?.aborted || isAbortError(e)) return
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [questionnaireId])

  React.useEffect(() => {
    const controller = new AbortController()
    void fetchCollaborators(controller.signal)
    return () => controller.abort()
  }, [fetchCollaborators])

  async function handleInvite() {
    if (!inviteEmail.trim() || selectedQuestions.size === 0) {
      toast.error("Please enter an email and select at least one question")
      return
    }
    setInviting(true)
    try {
      const res = await fetch(`/api/questionnaires/${questionnaireId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          questionIds: Array.from(selectedQuestions),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to add collaborator")
        return
      }
      toast.success(`${inviteName || inviteEmail} added`)
      setShowInvite(false)
      setInviteEmail("")
      setInviteName("")
      setSelectedQuestions(new Set())
      await fetchCollaborators()
    } finally {
      setInviting(false)
    }
  }

  async function handleDelete(collaboratorId: string, email: string) {
    setDeletingId(collaboratorId)
    try {
      const res = await fetch(
        `/api/questionnaires/${questionnaireId}/collaborators?collaboratorId=${collaboratorId}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        toast.success(`Removed ${email}`)
        await fetchCollaborators()
      } else {
        toast.error("Failed to remove collaborator")
      }
    } finally {
      setDeletingId(null)
    }
  }

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success("Link copied")
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openInEmail(email: string, url: string, name: string | null) {
    const subject = encodeURIComponent(`Your input is needed: ${questionnaireTitle}`)
    const body = encodeURIComponent(
      `Hi ${name ?? "there"},\n\nPlease answer your assigned questions here:\n${url}\n\nThank you`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Client Team Members</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign questions or whole sections to people on the client&apos;s side.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <PlusIcon className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {!responseExists && collaborators.length === 0 && (
        <Card className="shadow-card border-dashed">
          <CardContent className="py-8 text-center space-y-2">
            <UsersIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No team members yet.</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              You can pre-assign questions to client contacts. They&apos;ll get a personal link scoped to their questions.
            </p>
          </CardContent>
        </Card>
      )}

      {collaborators.length > 0 && (
        <Card className="shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {collaborators.map((c) => {
              const progress = c.assignedCount > 0
                ? Math.round((c.answeredCount / c.assignedCount) * 100)
                : 0
              const statusIcon =
                c.inviteStatus === "completed" ? (
                  <CheckCircle2Icon className="h-3 w-3 text-accent" />
                ) : c.inviteStatus === "active" ? (
                  <ClockIcon className="h-3 w-3 text-warning" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                )

              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">
                    {(c.name ?? c.email).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{c.name ?? c.email}</p>
                      {statusIcon}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 max-w-24 bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full w-full bg-[color:var(--accent)] rounded-full origin-left transition-transform"
                          style={{ transform: `scaleX(${progress / 100})` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {c.answeredCount}/{c.assignedCount}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost" className="h-9 w-9 p-0"
                      aria-label={`Copy link for ${c.name ?? c.email}`}
                      onClick={() => copyLink(c.collaboratorUrl, c.id)}
                    >
                      {copiedId === c.id
                        ? <CheckIcon className="h-3.5 w-3.5 text-accent" aria-hidden />
                        : <CopyIcon className="h-3.5 w-3.5" aria-hidden />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-9 w-9 p-0"
                      aria-label={`Send link by email to ${c.email}`}
                      onClick={() => openInEmail(c.email, c.collaboratorUrl, c.name)}
                    >
                      <MailIcon className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                      aria-label={`Remove ${c.name ?? c.email}`}
                      onClick={() => handleDelete(c.id, c.email)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id
                        ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        : <TrashIcon className="h-3.5 w-3.5" aria-hidden />}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-sm">Email <span className="text-destructive" aria-hidden>*</span></Label>
                <Input
                  id="invite-email"
                  type="email" placeholder="colleague@company.com"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-sm">Name (optional)</Label>
                <Input
                  id="invite-name"
                  placeholder="Jane Smith"
                  value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
            </div>
            <QuestionAssignmentPicker
              questions={questions}
              selectedIds={selectedQuestions}
              setSelectedIds={setSelectedQuestions}
              assignLabel="Assign questions or sections"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim() || selectedQuestions.size === 0}
            >
              {inviting && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Add Team Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Share Link Panel ─────────────────────────────────────────────────────────

function ShareLinkPanel({ shareUrl }: { shareUrl: string | null }) {
  const [copied, setCopied] = React.useState(false)

  function copy() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!shareUrl) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No share link available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-heading text-base">Share Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input value={shareUrl} readOnly className="font-mono text-xs" />
          <Button onClick={copy} size="sm" variant="outline">
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link with your prospect or client. They do not need an account to respond.
        </p>
      </CardContent>
    </Card>
  )
}
