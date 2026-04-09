"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { QuestionStatusBadge } from "@/components/shared/status-badge"
import {
  ArchiveIcon,
  BookOpenIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES_WITH_OPTIONS,
  type QuestionType,
  type QuestionStatus,
} from "@/types"

interface Question {
  id: string
  text: string
  type: string
  categoryId: string | null
  categoryName: string | null
  isRequired: boolean
  status: string
  options: string[] | null
  description: string | null
  /** Preset templates that include this bank question (empty = orphan for templates) */
  templates?: { id: string; name: string }[]
}

interface Category {
  id: string
  name: string
  description: string | null
  sortOrder: number
}

/** Stable accent per template id so the same name always picks the same pill color. */
function hashTemplateId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i)
  return Math.abs(h)
}

const TEMPLATE_PILL_STYLES = [
  "border-primary/30 bg-primary/10 text-primary",
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  "border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-200",
  "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-200",
  "border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-200",
  "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200",
  "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200",
  "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-900 dark:text-fuchsia-200",
] as const

function templatePillClass(templateId: string): string {
  return TEMPLATE_PILL_STYLES[hashTemplateId(templateId) % TEMPLATE_PILL_STYLES.length]
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("active")

  const [showQuestionDialog, setShowQuestionDialog] = React.useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = React.useState(false)
  const [editingQuestion, setEditingQuestion] = React.useState<Question | null>(null)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [qForm, setQForm] = React.useState({
    text: "",
    type: "short_text" as QuestionType,
    description: "",
    isRequired: false,
    categoryId: "",
    options: "",
  })
  const [catForm, setCatForm] = React.useState({ name: "", description: "", sortOrder: "0" })

  const [showImportDialog, setShowImportDialog] = React.useState(false)
  const [importFile, setImportFile] = React.useState<File | null>(null)
  const [importing, setImporting] = React.useState(false)
  const [importCreateCategories, setImportCreateCategories] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    else params.set("status", "all")

    const [qs, cats] = await Promise.all([
      fetch(`/api/questions?${params}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
    setQuestions(qs ?? [])
    setCategories(cats ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [search, categoryFilter, typeFilter, statusFilter])

  function openAddQuestion() {
    setEditingQuestion(null)
    setQForm({ text: "", type: "short_text", description: "", isRequired: false, categoryId: "", options: "" })
    setShowQuestionDialog(true)
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q)
    setQForm({
      text: q.text,
      type: q.type as QuestionType,
      description: q.description ?? "",
      isRequired: q.isRequired,
      categoryId: q.categoryId ?? "",
      options: q.options?.join("\n") ?? "",
    })
    setShowQuestionDialog(true)
  }

  async function handleSaveQuestion() {
    if (!qForm.text.trim()) { toast.error("Question text is required"); return }
    setSaving(true)
    const body = {
      text: qForm.text.trim(),
      type: qForm.type,
      description: qForm.description.trim() || null,
      isRequired: qForm.isRequired,
      categoryId: qForm.categoryId || null,
      options: QUESTION_TYPES_WITH_OPTIONS.includes(qForm.type)
        ? qForm.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : null,
    }

    const url = editingQuestion ? `/api/questions/${editingQuestion.id}` : "/api/questions"
    const method = editingQuestion ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

    if (res.ok) {
      toast.success(editingQuestion ? "Question updated" : "Question created")
      setShowQuestionDialog(false)
      loadData()
    } else {
      toast.error("Failed to save question")
    }
    setSaving(false)
  }

  async function handleArchiveQuestion(id: string) {
    if (!confirm("Archive this question? It will no longer appear in the question bank.")) return
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Question archived"); loadData() }
    else toast.error("Failed to archive")
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Permanently delete this question? It will be removed from the bank and from any templates. Existing questionnaires keep their own copy. This cannot be undone.")) return
    const res = await fetch(`/api/questions/${id}?permanent=true`, { method: "DELETE" })
    if (res.ok) { toast.success("Question deleted permanently"); loadData() }
    else toast.error("Failed to delete")
  }

  function openAddCategory() {
    setEditingCategory(null)
    setCatForm({ name: "", description: "", sortOrder: "0" })
    setShowCategoryDialog(true)
  }

  function openEditCategory(c: Category) {
    setEditingCategory(c)
    setCatForm({ name: c.name, description: c.description ?? "", sortOrder: String(c.sortOrder) })
    setShowCategoryDialog(true)
  }

  async function handleSaveCategory() {
    if (!catForm.name.trim()) { toast.error("Category name is required"); return }
    setSaving(true)
    const body = { name: catForm.name.trim(), description: catForm.description.trim() || null, sortOrder: Number(catForm.sortOrder) }
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories"
    const method = editingCategory ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

    if (res.ok) {
      toast.success(editingCategory ? "Category updated" : "Category created")
      setShowCategoryDialog(false)
      loadData()
    } else {
      toast.error("Failed to save category")
    }
    setSaving(false)
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Delete this category?")) return
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Category deleted"); loadData() }
    else toast.error("Failed to delete")
  }

  async function handleImportCsv() {
    if (!importFile) {
      toast.error("Choose a CSV file")
      return
    }
    setImporting(true)
    const fd = new FormData()
    fd.set("file", importFile)
    if (importCreateCategories) fd.set("createMissingCategories", "true")
    const res = await fetch("/api/questions/import", { method: "POST", body: fd })
    const data = await res.json().catch(() => ({}))
    setImporting(false)
    if (res.ok && data.success) {
      const c = data.created ?? {}
      toast.success(`Imported ${c.questions ?? 0} question(s)`)
      setShowImportDialog(false)
      setImportFile(null)
      setImportCreateCategories(false)
      loadData()
    } else {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const preview = data.errors
          .slice(0, 5)
          .map((e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`)
          .join("\n")
        toast.error(data.error ?? "Import failed", {
          description: preview + (data.errors.length > 5 ? "\n…" : ""),
          duration: 8000,
        })
      } else {
        toast.error(data.error ?? data.detail ?? "Import failed")
      }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all reusable questions for questionnaire templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <UploadIcon className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={openAddCategory}>
            <TagIcon className="h-4 w-4" />
            Add Category
          </Button>
          <Button onClick={openAddQuestion}>
            <PlusIcon className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-52">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BookOpenIcon className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No questions found</p>
                  <Button size="sm" onClick={openAddQuestion}>
                    <PlusIcon className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Question</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground max-w-56">
                        Templates
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 max-w-sm">
                          <p className="font-medium truncate">{q.text}</p>
                          {q.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{q.description}</p>
                          )}
                          {q.isRequired && <Badge variant="outline" className="text-xs mt-1">Required</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {QUESTION_TYPE_LABELS[q.type as QuestionType] ?? q.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{q.categoryName ?? "—"}</td>
                        <td className="px-4 py-3 max-w-[min(18rem,28vw)] align-top">
                          {!q.templates || q.templates.length === 0 ? (
                            <span
                              className="inline-flex max-w-full rounded-full border border-dashed border-muted-foreground/35 bg-muted/50 px-2 py-0.5 text-[11px] font-medium italic text-muted-foreground"
                              title="Not linked to any preset template yet"
                            >
                              Orphan
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {q.templates.map((t) => (
                                <span
                                  key={t.id}
                                  title={t.name}
                                  className={cn(
                                    "inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight",
                                    templatePillClass(t.id)
                                  )}
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <QuestionStatusBadge status={q.status as QuestionStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditQuestion(q)}>
                                <PencilIcon className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleArchiveQuestion(q.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <ArchiveIcon className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteQuestion(q.id)}
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
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <TagIcon className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No categories yet</p>
                  <Button size="sm" onClick={openAddCategory}>
                    <PlusIcon className="h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.description ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.sortOrder}</td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditCategory(c)}>
                                <PencilIcon className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteCategory(c.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
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
        </TabsContent>
      </Tabs>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text <span className="text-destructive">*</span></Label>
              <Textarea
                value={qForm.text}
                onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                placeholder="Enter question text..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={qForm.type} onValueChange={(v) => setQForm({ ...qForm, type: v as QuestionType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={qForm.categoryId} onValueChange={(v) => setQForm({ ...qForm, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {QUESTION_TYPES_WITH_OPTIONS.includes(qForm.type) && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <Textarea
                  value={qForm.options}
                  onChange={(e) => setQForm({ ...qForm, options: e.target.value })}
                  placeholder="Option A&#10;Option B&#10;Option C"
                  rows={4}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Help Text</Label>
              <Input
                value={qForm.description}
                onChange={(e) => setQForm({ ...qForm, description: e.target.value })}
                placeholder="Optional context for respondents..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="q-required"
                checked={qForm.isRequired}
                onCheckedChange={(v) => setQForm({ ...qForm, isRequired: v === true })}
              />
              <Label htmlFor="q-required" className="font-normal cursor-pointer">Required by default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Financial Data" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })} className="w-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {editingCategory ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showImportDialog}
        onOpenChange={(open) => {
          setShowImportDialog(open)
          if (!open) {
            setImportFile(null)
            setImportCreateCategories(false)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk import from CSV</DialogTitle>
            <DialogDescription>
              Add many questions to the bank at once. Each row becomes a new question; existing rows are not updated or
              merged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                File requirements
              </p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground leading-relaxed">
                <li>
                  Save as <span className="font-medium text-foreground">UTF-8</span> with a{" "}
                  <span className="font-medium text-foreground">header row</span> (column names in the first line).
                  Header names are matched case-insensitively; spaces or underscores both work.
                </li>
                <li>
                  Expected columns:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                    text, type, description, options, is_required, category_name, sort_order
                  </code>
                </li>
                <li>
                  For <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">single_select</code> and{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">multi_select</code>, separate
                  choices in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">options</code> with{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">|</code> (pipe).
                </li>
                <li>Extra columns (for example from older exports) are ignored.</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                After import
              </p>
              <p className="text-muted-foreground leading-relaxed">
                New questions appear in this bank only. To use them on a preset questionnaire type, open{" "}
                <span className="font-medium text-foreground">Admin → Templates</span> and add the questions to the
                right template.
              </p>
            </div>
            <a
              href="/samples/question-bank-import-sample.csv"
              download
              className="inline-flex text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Download sample CSV
            </a>
            <div className="flex items-start gap-2">
              <Checkbox
                id="import-cats"
                className="mt-0.5"
                checked={importCreateCategories}
                onCheckedChange={(v) => setImportCreateCategories(v === true)}
              />
              <Label htmlFor="import-cats" className="font-normal cursor-pointer leading-snug">
                If a row names a category that does not exist yet, create it automatically (names must match exactly).
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-file">Choose file</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleImportCsv} disabled={importing}>
              {importing && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
