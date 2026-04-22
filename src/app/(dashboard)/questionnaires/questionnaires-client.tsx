"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { QuestionnairStatusBadge } from "@/components/shared/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  CopyIcon,
  ExternalLinkIcon,
  ArchiveIcon,
  RefreshCwIcon,
  ClipboardListIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  QUESTIONNAIRE_STATUS_LABELS,
  QUESTIONNAIRE_TYPE_LABELS,
  type QuestionnaireStatus,
  type QuestionnaireType,
} from "@/types"

interface QuestionnaireRow {
  id: string
  title: string
  type: string
  status: string
  clientName: string | null
  ownerName: string | null
  ownerId: string
  updatedAt: string | null
  submittedAt: string | null
}

interface Props {
  isAdmin: boolean
  currentUserId: string
}

export function QuestionnairesClient({ isAdmin, currentUserId }: Props) {
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [typeFilter, setTypeFilter] = React.useState("all")

  const load = React.useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)

    const res = await fetch(`/api/questionnaires?${params}`)
    if (res.ok) setQuestionnaires(await res.json())
    setLoading(false)
  }, [search, statusFilter, typeFilter])

  React.useEffect(() => {
    void load()
  }, [load])

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/questionnaires/${id}/duplicate`, { method: "POST" })
    if (res.ok) {
      const q = await res.json()
      toast.success("Questionnaire duplicated")
      router.push(`/questionnaires/${q.id}`)
    } else {
      toast.error("Failed to duplicate")
    }
  }

  async function handleReopen(id: string) {
    const res = await fetch(`/api/questionnaires/${id}/reopen`, { method: "POST" })
    if (res.ok) {
      toast.success("Questionnaire reopened")
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to reopen")
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this questionnaire?")) return
    const res = await fetch(`/api/questionnaires/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Archived")
      load()
    } else {
      toast.error("Failed to archive")
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Permanently delete "${title}"? This will remove all responses and cannot be undone.`)) return
    const res = await fetch(`/api/questionnaires/${id}?permanent=true`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Deleted permanently")
      load()
    } else {
      toast.error("Failed to delete")
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "All questionnaires on the platform" : "Your questionnaires"}
          </p>
        </div>
        <Button asChild>
          <Link href="/questionnaires/new">
            <PlusIcon className="h-4 w-4" />
            New Questionnaire
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            aria-label="Search questionnaires"
            placeholder="Search questionnaires..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(QUESTIONNAIRE_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(QUESTIONNAIRE_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : questionnaires.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <ClipboardListIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No questionnaires found</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create your first questionnaire to get started</p>
              </div>
              <Button asChild size="sm" className="mt-1">
                <Link href="/questionnaires/new">
                  <PlusIcon className="h-4 w-4" />
                  New Questionnaire
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Client</th>
                    {isAdmin && <th className="text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Owner</th>}
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Updated</th>
                    <th className="px-4 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {questionnaires.map((q, i) => (
                    <tr key={q.id} className={`hover:bg-muted/40 transition-colors ${i > 0 ? "border-t border-border" : ""}`}>
                      <td className="px-5 py-3.5 max-w-64">
                        <Link href={`/questionnaires/${q.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block">
                          {q.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {QUESTIONNAIRE_TYPE_LABELS[q.type as QuestionnaireType] ?? q.type}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{q.clientName ?? <span className="text-muted-foreground/40">—</span>}</td>
                      {isAdmin && <td className="px-4 py-3.5 text-sm text-muted-foreground">{q.ownerName ?? <span className="text-muted-foreground/40">—</span>}</td>}
                      <td className="px-4 py-3.5">
                        <QuestionnairStatusBadge status={q.status as QuestionnaireStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {q.updatedAt ? format(new Date(q.updatedAt), "MMM d, yyyy") : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${q.title}`}>
                              <MoreHorizontalIcon className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/questionnaires/${q.id}`}>
                                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(q.id)}>
                              <CopyIcon className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {q.status === "submitted" &&
                              (isAdmin || q.ownerId === currentUserId) && (
                                <DropdownMenuItem onClick={() => handleReopen(q.id)}>
                                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                                  Reopen
                                </DropdownMenuItem>
                              )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleArchive(q.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <ArchiveIcon className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(q.id, q.title)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2Icon className="mr-2 h-4 w-4" />
                                Delete permanently
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
