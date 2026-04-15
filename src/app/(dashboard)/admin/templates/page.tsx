"use client"

import * as React from "react"
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
import { QUESTIONNAIRE_TYPE_LABELS, QUESTION_TYPE_LABELS, type QuestionnaireType, type QuestionType } from "@/types"

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
}

interface TemplateQuestion {
  questionId: string
  text: string
  type: string
  description: string | null
  isRequired: boolean
}

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showDialog, setShowDialog] = React.useState(false)
  const [editing, setEditing] = React.useState<Template | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({ name: "", type: "", description: "" })
  const [templateQuestions, setTemplateQuestions] = React.useState<TemplateQuestion[]>([])
  const [qSearch, setQSearch] = React.useState("")

  async function load() {
    setLoading(true)
    const [ts, qs] = await Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/questions?status=active").then((r) => r.json()),
    ])
    setTemplates(ts ?? [])
    setQuestions(qs ?? [])
    setLoading(false)
  }

  React.useEffect(() => { load() }, [])

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
        isRequired: false,
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Templates</h1>
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {QUESTIONNAIRE_TYPE_LABELS[t.type as QuestionnaireType] ?? t.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.isActive ? "default" : "outline"} className="text-xs">
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="h-4 w-4" /></Button>
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
        <DialogContent className="flex h-[min(92dvh,920px)] max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:left-[50%] sm:top-[50%] sm:max-w-[min(88rem,calc(100vw-2rem))] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl">
          <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl">{editing ? "Edit Template" : "New Template"}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4 sm:px-6">
            <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard ROI Template" />
              </div>
              <div className="space-y-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTIONNAIRE_TYPE_LABELS)
                      .filter(([v]) => v !== "custom")
                      .map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="shrink-0 space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="min-h-18 resize-y" />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-2 lg:gap-6">
              {/* Question Bank Picker */}
              <div className="flex min-h-[min(42dvh,360px)] flex-col gap-2 lg:min-h-0">
                <p className="shrink-0 text-sm font-medium">Question Bank</p>
                <div className="relative shrink-0">
                  <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search question or description…"
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1.5">
                  {filteredBankQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => addQuestion(q)}
                      className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-left text-sm shadow-sm transition-colors hover:bg-muted/60"
                    >
                      <p className="font-medium leading-snug text-foreground wrap-break-word">{q.text}</p>
                      {q.description ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground wrap-break-word">{q.description}</p>
                      ) : null}
                      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                        {QUESTION_TYPE_LABELS[q.type as QuestionType]}
                        {q.categoryName ? ` · ${q.categoryName}` : ""}
                      </p>
                    </button>
                  ))}
                  {filteredBankQuestions.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No questions available</p>
                  )}
                </div>
              </div>

              {/* Selected Questions */}
              <div className="flex min-h-[min(42dvh,360px)] flex-col gap-2 lg:min-h-0">
                <p className="shrink-0 text-sm font-medium">Template questions ({templateQuestions.length})</p>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1.5">
                  {templateQuestions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No questions added yet</p>
                  ) : (
                    templateQuestions.map((tq, i) => (
                      <div
                        key={tq.questionId}
                        className="flex gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
                      >
                        <span className="w-6 shrink-0 pt-0.5 text-right text-xs font-medium text-muted-foreground tabular-nums">
                          {i + 1}.
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
                          onClick={() => removeTemplateQ(tq.questionId)}
                          className="shrink-0 self-start rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove from template"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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
