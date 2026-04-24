"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArchiveIcon,
  GripVerticalIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/types"

/** Drag id prefix for bank → template (never overlaps UUIDs). */
const BANK_DRAG_PREFIX = "bank-q:" as const

function bankDragId(questionId: string): string {
  return `${BANK_DRAG_PREFIX}${questionId}`
}

function isBankDragId(id: UniqueIdentifier): boolean {
  return String(id).startsWith(BANK_DRAG_PREFIX)
}

function parseBankQuestionId(id: UniqueIdentifier): string {
  return String(id).slice(BANK_DRAG_PREFIX.length)
}

/** Slot index from viewport Y: insert before row i where pointer is above that row's midpoint (append if below all). */
function computeInsertIndexAmongRows(rows: HTMLElement[], clientY: number): number {
  if (rows.length === 0) return 0
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i].getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (clientY < midY) return i
  }
  return rows.length
}

/** Bank insert: all template rows participate (none excluded). */
function computeBankInsertIndex(columnEl: HTMLElement, clientY: number): number {
  const rows = [...columnEl.querySelectorAll<HTMLElement>("[data-template-row]")]
  return computeInsertIndexAmongRows(rows, clientY)
}

function isPointerInsideTemplateColumn(columnEl: HTMLElement | null, x: number, y: number): boolean {
  if (!columnEl) return false
  const r = columnEl.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

interface Template {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
}

interface Question {
  id: string
  text: string
  type: string
  categoryName: string | null
  description: string | null
  isRequired: boolean
}

interface TemplateQuestion {
  questionId: string
  text: string
  type: string
  description: string | null
  isRequired: boolean
}

type DragOverlayPayload =
  | { kind: "bank"; question: Question }
  | { kind: "template"; row: TemplateQuestion }

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [qTypeOptions, setQTypeOptions] = React.useState<{ slug: string; label: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showDialog, setShowDialog] = React.useState(false)
  const [editing, setEditing] = React.useState<Template | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({ name: "", type: "", description: "" })
  const [templateQuestions, setTemplateQuestions] = React.useState<TemplateQuestion[]>([])
  const [qSearch, setQSearch] = React.useState("")
  /** Bank → template and template reorder both use the same overlay + pointer-geometry drop (see BankQuestionRow / DraggableTemplateRow). */
  const [dragOverlay, setDragOverlay] = React.useState<DragOverlayPayload | null>(null)
  const templateDropColumnRef = React.useRef<HTMLDivElement | null>(null)
  const lastPointerRef = React.useRef({ x: 0, y: 0 })
  /**
   * The portal overlay div — lives in document.body so it is never inside a
   * CSS-transformed ancestor (Radix Dialog uses transform: translate(-50%,-50%) to center
   * itself, which creates a new fixed-position containing block that offsets child
   * fixed elements). Direct DOM style updates avoid React render overhead.
   */
  const portalOverlayRef = React.useRef<HTMLDivElement | null>(null)

  const pointerTrackingActive = dragOverlay !== null

  React.useEffect(() => {
    if (!pointerTrackingActive) return
    const handler = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      const el = portalOverlayRef.current
      if (el) {
        el.style.left = `${e.clientX - el.offsetWidth / 2}px`
        el.style.top = `${e.clientY - el.offsetHeight / 2}px`
      }
    }
    window.addEventListener("pointermove", handler, { capture: true, passive: true })
    return () => window.removeEventListener("pointermove", handler, { capture: true })
  }, [pointerTrackingActive])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragStart(event: DragStartEvent) {
    const { active, activatorEvent } = event
    if (isBankDragId(active.id)) {
      const qid = parseBankQuestionId(active.id)
      const q = questions.find((x) => x.id === qid)
      setDragOverlay(q ? { kind: "bank", question: q } : null)
    } else {
      const qid = String(active.id)
      const row = templateQuestions.find((t) => t.questionId === qid)
      setDragOverlay(row ? { kind: "template", row } : null)
    }
    if (activatorEvent instanceof PointerEvent) {
      lastPointerRef.current = { x: activatorEvent.clientX, y: activatorEvent.clientY }
      // Position the portal overlay at the initial pointer — rAF so the element is mounted first.
      requestAnimationFrame(() => {
        const el = portalOverlayRef.current
        if (el) {
          el.style.left = `${activatorEvent.clientX - el.offsetWidth / 2}px`
          el.style.top = `${activatorEvent.clientY - el.offsetHeight / 2}px`
        }
      })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event

    if (isBankDragId(active.id)) {
      const qid = parseBankQuestionId(active.id)
      const bankQ = questions.find((x) => x.id === qid)
      setDragOverlay(null)
      if (!bankQ) return
      const col = templateDropColumnRef.current
      const { x: px, y: py } = lastPointerRef.current
      if (!isPointerInsideTemplateColumn(col, px, py)) {
        return
      }
      if (templateQuestions.some((t) => t.questionId === qid)) {
        toast.error("Already added")
        return
      }
      const newEntry: TemplateQuestion = {
        questionId: bankQ.id,
        text: bankQ.text,
        type: bankQ.type,
        description: bankQ.description ?? null,
        isRequired: bankQ.isRequired,
      }
      const insertIndex = col ? computeBankInsertIndex(col, py) : 0
      setTemplateQuestions((prev) => {
        if (prev.some((t) => t.questionId === qid)) return prev
        const next = [...prev]
        next.splice(insertIndex, 0, newEntry)
        return next
      })
      return
    }

    setDragOverlay(null)

    const oldIndex = templateQuestions.findIndex((t) => t.questionId === active.id)
    if (oldIndex < 0) return

    const col = templateDropColumnRef.current
    const { x: px, y: py } = lastPointerRef.current
    if (!col || !isPointerInsideTemplateColumn(col, px, py)) return

    const rows = [...col.querySelectorAll<HTMLElement>("[data-template-row]")]
    const dragId = String(active.id)
    const dragEl = rows.find((r) => r.dataset.templateRowId === dragId)
    if (!dragEl) return

    const others = rows.filter((r) => r !== dragEl)
    const targetSlot = computeInsertIndexAmongRows(others, py)
    const prev = templateQuestions
    const item = prev[oldIndex]
    const rest = prev.filter((_, i) => i !== oldIndex)
    const newOrder = [...rest.slice(0, targetSlot), item, ...rest.slice(targetSlot)]
    setTemplateQuestions((cur) => {
      if (newOrder.length !== cur.length) return cur
      const same = newOrder.every((q, i) => q.questionId === cur[i].questionId)
      return same ? cur : newOrder
    })
  }

  function handleDragCancel() {
    setDragOverlay(null)
  }

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const [ts, qs, qt] = await Promise.all([
        fetch("/api/templates", { signal }).then((r) => r.json()),
        fetch("/api/questions?status=active", { signal }).then((r) => r.json()),
        fetch("/api/questionnaire-types", { signal }).then((r) => r.json()),
      ])
      if (signal?.aborted) return
      setTemplates(ts ?? [])
      setQuestions(qs ?? [])
      setQTypeOptions((qt ?? []).filter((t: { slug: string }) => t.slug !== "custom"))
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      throw e
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function openEdit(t: Template) {
    setEditing(t)
    setForm({ name: t.name, type: t.type, description: t.description ?? "" })
    const detail = await fetch(`/api/templates/${t.id}`).then((r) => r.json())
    setTemplateQuestions(
      (detail.questions ?? []).map((q: Record<string, unknown>) => ({
        questionId: q.questionId as string,
        text: q.text as string,
        type: q.type as string,
        description: (q.description as string | null) ?? null,
        isRequired: q.isRequired as boolean,
      }))
    )
    setShowDialog(true)
  }

  function openAdd() {
    setEditing(null)
    setForm({ name: "", type: "", description: "" })
    setTemplateQuestions([])
    setShowDialog(true)
  }

  function addQuestion(q: Question) {
    if (templateQuestions.some((tq) => tq.questionId === q.id)) {
      toast.error("Already added")
      return
    }
    setTemplateQuestions((prev) => [
      ...prev,
      {
        questionId: q.id,
        text: q.text,
        type: q.type,
        description: q.description ?? null,
        isRequired: q.isRequired,
      },
    ])
  }

  function removeTemplateQ(qId: string) {
    setTemplateQuestions((prev) => prev.filter((q) => q.questionId !== qId))
  }

  async function handleSave() {
    if (!form.name || !form.type) { toast.error("Name and type are required"); return }
    setSaving(true)
    const url = editing ? `/api/templates/${editing.id}` : "/api/templates"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        questions: templateQuestions.map((q) => ({ questionId: q.questionId, isRequired: q.isRequired })),
      }),
    })
    if (res.ok) {
      toast.success(editing ? "Template updated" : "Template created")
      setShowDialog(false)
      load()
    } else {
      let message = "Failed to save template"
      try {
        const data = (await res.json()) as { error?: string }
        if (data?.error) message = data.error
      } catch {
        /* ignore */
      }
      toast.error(message)
    }
    setSaving(false)
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this template?")) return
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Template deactivated"); load() }
    else toast.error("Failed")
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Permanently delete this template? The template definition will be removed and its link to existing questionnaires will be cleared. Existing questionnaires and their questions are unaffected. This cannot be undone.")) return
    const res = await fetch(`/api/templates/${id}?permanent=true`, { method: "DELETE" })
    if (res.ok) { toast.success("Template deleted permanently"); load() }
    else toast.error("Failed to delete")
  }

  const qSearchLower = qSearch.trim().toLowerCase()
  const filteredBankQuestions = questions.filter((q) => {
    if (templateQuestions.some((tq) => tq.questionId === q.id)) return false
    if (!qSearchLower) return true
    if (q.text.toLowerCase().includes(qSearchLower)) return true
    const desc = q.description?.toLowerCase() ?? ""
    return desc.includes(qSearchLower)
  })

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-1">Manage preset questionnaire templates</p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <LayoutTemplateIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No templates yet</p>
              <Button size="sm" onClick={openAdd}><PlusIcon className="h-4 w-4" />Create Template</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {qTypeOptions.find((o) => o.slug === t.type)?.label ?? t.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={t.isActive ? "success" : "outline"}
                        className={t.isActive ? "text-xs" : "text-xs text-muted-foreground"}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${t.name}`}>
                            <MoreHorizontalIcon className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <PencilIcon className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          {t.isActive && (
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(t.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <ArchiveIcon className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Delete permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="flex h-[min(92dvh,920px)] max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(88rem,calc(100vw-2rem))] sm:rounded-xl">
          <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl">{editing ? "Edit Template" : "New Template"}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4 sm:px-6">
            <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tmpl-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tmpl-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Standard ROI Template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger id="tmpl-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {qTypeOptions.map(({ slug, label }) => (
                      <SelectItem key={slug} value={slug}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="shrink-0 space-y-2">
              <Label htmlFor="tmpl-description">Description</Label>
              <Textarea
                id="tmpl-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="min-h-18 resize-y"
              />
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-2 lg:gap-6">
                {/* Question Bank Picker */}
                <div className="flex min-h-[min(42dvh,360px)] flex-col gap-2 lg:min-h-0">
                  <p className="shrink-0 text-sm font-medium">Question Bank</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Drag from the grip into the template column — drop above or below existing rows by position. Click the
                    card to add at the end.
                  </p>
                  <div className="relative shrink-0">
                    <Label htmlFor="tmpl-bank-search" className="sr-only">
                      Search question bank
                    </Label>
                    <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="tmpl-bank-search"
                      placeholder="Search question or description…"
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1.5">
                    {filteredBankQuestions.map((q) => (
                      <BankQuestionRow key={q.id} question={q} dragId={bankDragId(q.id)} onAppend={() => addQuestion(q)} />
                    ))}
                    {filteredBankQuestions.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No questions available</p>
                    )}
                  </div>
                </div>

                {/* Template questions — same useDraggable + pointer geometry + overlay as Question Bank */}
                <div className="flex min-h-[min(42dvh,360px)] flex-col gap-2 lg:min-h-0">
                  <p className="shrink-0 text-sm font-medium">Template questions ({templateQuestions.length})</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Use the grip on the left like the bank: drag, then drop in this column — position follows your pointer vs.
                    row midpoints (reorder or add from the bank the same way).
                  </p>
                  <div
                    ref={templateDropColumnRef}
                    className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1.5"
                  >
                    {templateQuestions.length === 0 ? (
                      <TemplateEmptyDrop />
                    ) : (
                      templateQuestions.map((tq, i) => (
                        <DraggableTemplateRow
                          key={tq.questionId}
                          index={i}
                          question={tq}
                          onRemove={() => removeTemplateQ(tq.questionId)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Portal overlay — rendered into document.body to escape the Dialog's CSS transform
                  containing block; position is updated directly via DOM style mutations. */}
              {dragOverlay && typeof document !== "undefined" && createPortal(
                <div
                  ref={portalOverlayRef}
                  style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none" }}
                  className="max-w-xs rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-xl opacity-95"
                >
                  <p className="font-medium leading-snug text-foreground wrap-break-word">
                    {dragOverlay.kind === "bank" ? dragOverlay.question.text : dragOverlay.row.text}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    {QUESTION_TYPE_LABELS[
                      (dragOverlay.kind === "bank" ? dragOverlay.question.type : dragOverlay.row.type) as QuestionType
                    ]}
                  </p>
                </div>,
                document.body
              )}
            </DndContext>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BankQuestionRow({
  question,
  dragId,
  onAppend,
}: {
  question: Question
  dragId: string
  onAppend: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex gap-2 rounded-md border border-border bg-card px-2 py-2.5 text-sm shadow-sm transition-opacity",
        isDragging && "opacity-40"
      )}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag to template: ${question.text.slice(0, 120)}`}
        {...listeners}
        {...attributes}
      >
        <GripVerticalIcon className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onAppend}
        className="min-w-0 flex-1 rounded-md px-1 py-0 text-left transition-colors hover:bg-muted/60"
      >
        <p className="font-medium leading-snug text-foreground wrap-break-word">{question.text}</p>
        {question.description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground wrap-break-word">{question.description}</p>
        ) : null}
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          {QUESTION_TYPE_LABELS[question.type as QuestionType]}
          {question.categoryName ? ` · ${question.categoryName}` : ""}
        </p>
      </button>
    </div>
  )
}

function DraggableTemplateRow({
  question: tq,
  index,
  onRemove,
}: {
  question: TemplateQuestion
  index: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tq.questionId })

  return (
    <div
      ref={setNodeRef}
      data-template-row
      data-template-row-id={tq.questionId}
      aria-grabbed={isDragging}
      className={cn(
        "flex gap-2 rounded-md border border-border bg-card px-2 py-2.5 text-sm shadow-sm transition-opacity",
        isDragging && "opacity-40"
      )}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag in template: ${tq.text.slice(0, 120)}`}
        {...listeners}
        {...attributes}
      >
        <GripVerticalIcon className="h-4 w-4" aria-hidden />
      </button>
      <span className="w-6 shrink-0 pt-0.5 text-right text-xs font-medium text-muted-foreground tabular-nums">
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-foreground wrap-break-word">{tq.text}</p>
        {tq.description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground wrap-break-word">{tq.description}</p>
        ) : null}
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          {QUESTION_TYPE_LABELS[tq.type as QuestionType]}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 self-start rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove from template"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function TemplateEmptyDrop() {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
      <p>No questions added yet</p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed">
        Drag from the bank into this column (drop position follows your pointer), or click a bank card to append at the end.
      </p>
    </div>
  )
}
