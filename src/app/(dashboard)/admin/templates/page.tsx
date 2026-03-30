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
}

interface TemplateQuestion {
  questionId: string
  text: string
  type: string
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
      { questionId: q.id, text: q.text, type: q.type, isRequired: false },
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
      toast.error("Failed to save template")
    }
    setSaving(false)
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this template?")) return
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Template deactivated"); load() }
    else toast.error("Failed")
  }

  const filteredBankQuestions = questions.filter(
    (q) =>
      !templateQuestions.some((tq) => tq.questionId === q.id) &&
      (qSearch ? q.text.toLowerCase().includes(qSearch.toLowerCase()) : true)
  )

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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              {/* Question Bank Picker */}
              <div>
                <p className="text-sm font-medium mb-2">Question Bank</p>
                <div className="relative mb-2">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredBankQuestions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => addQuestion(q)}
                      className="w-full text-left rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors border border-border"
                    >
                      <p className="font-medium truncate">{q.text}</p>
                      <p className="text-muted-foreground">{QUESTION_TYPE_LABELS[q.type as QuestionType]}</p>
                    </button>
                  ))}
                  {filteredBankQuestions.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">No questions available</p>
                  )}
                </div>
              </div>

              {/* Selected Questions */}
              <div>
                <p className="text-sm font-medium mb-2">Template Questions ({templateQuestions.length})</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {templateQuestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No questions added yet</p>
                  ) : (
                    templateQuestions.map((tq, i) => (
                      <div key={tq.questionId} className="flex items-center gap-2 rounded-md px-2.5 py-2 bg-muted/60 text-xs">
                        <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                        <p className="flex-1 font-medium truncate">{tq.text}</p>
                        <button onClick={() => removeTemplateQ(tq.questionId)} className="text-muted-foreground hover:text-destructive">
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
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
