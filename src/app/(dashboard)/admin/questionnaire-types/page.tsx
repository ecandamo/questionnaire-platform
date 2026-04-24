"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
  LockIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  DEFAULT_QUESTIONNAIRE_TYPE_COLOR,
  QUESTIONNAIRE_TYPE_COLOR_OPTIONS,
  getQuestionnaireTypePillClass,
  type QuestionnaireTypeColor,
} from "@/lib/questionnaire-type-colors"

interface QCategory {
  slug: string
  label: string
  color: QuestionnaireTypeColor
  isSystem: boolean
  isActive: boolean
  sortOrder: number
}

function deriveSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64)
}

export default function QuestionnaireTypesPage() {
  const [types, setTypes] = React.useState<QCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showDialog, setShowDialog] = React.useState(false)
  const [editing, setEditing] = React.useState<QCategory | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [color, setColor] = React.useState<QuestionnaireTypeColor>(DEFAULT_QUESTIONNAIRE_TYPE_COLOR)
  const [deleteBlocked, setDeleteBlocked] = React.useState<{
    slug: string
    label: string
    questionnaireCount: number
    templateCount: number
  } | null>(null)

  const derivedSlug = editing ? editing.slug : deriveSlug(label)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/questionnaire-types?all=true")
    if (res.ok) setTypes(await res.json())
    setLoading(false)
  }

  React.useEffect(() => {
    void load()
  }, [])

  function openCreate() {
    setEditing(null)
    setLabel("")
    setColor(DEFAULT_QUESTIONNAIRE_TYPE_COLOR)
    setShowDialog(true)
  }

  function openEdit(t: QCategory) {
    setEditing(t)
    setLabel(t.label)
    setColor(t.color ?? DEFAULT_QUESTIONNAIRE_TYPE_COLOR)
    setShowDialog(true)
  }

  async function handleSave() {
    if (!label.trim()) {
      toast.error("Label is required")
      return
    }
    setSaving(true)
    if (editing) {
      const res = await fetch(`/api/questionnaire-types/${editing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), color }),
      })
      if (res.ok) {
        toast.success("Type updated")
        setShowDialog(false)
        load()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error ?? "Failed to update")
      }
    } else {
      const res = await fetch("/api/questionnaire-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), color }),
      })
      if (res.ok) {
        toast.success("Type created")
        setShowDialog(false)
        load()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error ?? "Failed to create")
      }
    }
    setSaving(false)
  }

  async function handleToggleActive(t: QCategory) {
    const res = await fetch(`/api/questionnaire-types/${t.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    })
    if (res.ok) {
      toast.success(t.isActive ? "Type archived" : "Type restored")
      load()
    } else {
      toast.error("Failed to update")
    }
  }

  async function handleDelete(t: QCategory) {
    const res = await fetch(`/api/questionnaire-types/${t.slug}`, { method: "DELETE" })
    if (res.status === 204) {
      toast.success("Type deleted")
      load()
      return
    }
    const data = await res.json().catch(() => ({}))
    if (res.status === 409) {
      const d = data as { questionnaireCount?: number; templateCount?: number }
      setDeleteBlocked({
        slug: t.slug,
        label: t.label,
        questionnaireCount: d.questionnaireCount ?? 0,
        templateCount: d.templateCount ?? 0,
      })
    } else {
      toast.error((data as { error?: string }).error ?? "Failed to delete")
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage the categories used to classify questionnaires
        </p>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          New Type
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : types.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <TagIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No types yet</p>
              <Button size="sm" onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                Create Type
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Label</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Color</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">System</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Active</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {types.map((t) => (
                  <tr key={t.slug} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {t.label}
                        {t.isSystem && (
                          <LockIcon className="h-3 w-3 text-muted-foreground/60 shrink-0" aria-label="System type" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {t.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQuestionnaireTypePillClass(t.color)}`}
                      >
                        {QUESTIONNAIRE_TYPE_COLOR_OPTIONS.find((option) => option.value === t.color)?.label ?? "Slate"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.isSystem ? (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={t.isActive}
                        onCheckedChange={() => handleToggleActive(t)}
                        aria-label={`${t.isActive ? "Archive" : "Restore"} "${t.label}"`}
                        className="scale-75"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${t.label}`}
                          >
                            <MoreHorizontalIcon className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Edit label
                          </DropdownMenuItem>
                          {!t.isSystem && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(t)}
                              className="text-destructive focus:text-destructive"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete
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

      {/* Create / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Type" : "New Questionnaire Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="type-label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="type-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Security Assessment"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") void handleSave() }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-color">Color</Label>
              <Select value={color} onValueChange={(value) => setColor(value as QuestionnaireTypeColor)}>
                <SelectTrigger id="type-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTIONNAIRE_TYPE_COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Slug{editing ? " (immutable)" : " (auto-derived)"}
              </p>
              <code className="block text-xs rounded bg-muted px-2 py-1.5 text-muted-foreground">
                {derivedSlug || <span className="opacity-40">—</span>}
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !label.trim()}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete-blocked dialog */}
      <Dialog open={!!deleteBlocked} onOpenChange={() => setDeleteBlocked(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cannot Delete</DialogTitle>
          </DialogHeader>
          {deleteBlocked && (
            <div className="space-y-3 py-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{deleteBlocked.label}</span> is still
                in use and cannot be deleted:
              </p>
              <ul className="space-y-1 list-disc list-inside">
                {deleteBlocked.questionnaireCount > 0 && (
                  <li>
                    {deleteBlocked.questionnaireCount} questionnaire
                    {deleteBlocked.questionnaireCount > 1 ? "s" : ""}
                  </li>
                )}
                {deleteBlocked.templateCount > 0 && (
                  <li>
                    {deleteBlocked.templateCount} template
                    {deleteBlocked.templateCount > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
              <p>Archive it instead to hide it from future selections.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBlocked(null)}>
              Close
            </Button>
            {deleteBlocked && (
              <Button
                onClick={() => {
                  const t = types.find((x) => x.slug === deleteBlocked.slug)
                  if (t) void handleToggleActive(t)
                  setDeleteBlocked(null)
                }}
              >
                Archive instead
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
