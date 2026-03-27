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

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)

    const res = await fetch(`/api/questionnaires?${params}`)
    if (res.ok) setQuestionnaires(await res.json())
    setLoading(false)
  }

  React.useEffect(() => {
    load()
  }, [search, statusFilter, typeFilter])

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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Questionnaires</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questionnaires..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
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
          <SelectTrigger className="w-44">
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
      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2Icon className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : questionnaires.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ClipboardListIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No questionnaires found</p>
              <p className="text-xs text-muted-foreground">Create your first questionnaire to get started</p>
              <Button asChild size="sm" className="mt-1">
                <Link href="/questionnaires/new">
                  <PlusIcon className="h-4 w-4" />
                  New Questionnaire
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                    {isAdmin && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>}
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {questionnaires.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-64 truncate">
                        <Link href={`/questionnaires/${q.id}`} className="hover:text-primary transition-colors">
                          {q.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {QUESTIONNAIRE_TYPE_LABELS[q.type as QuestionnaireType] ?? q.type}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{q.clientName ?? "—"}</td>
                      {isAdmin && <td className="px-4 py-3 text-muted-foreground">{q.ownerName ?? "—"}</td>}
                      <td className="px-4 py-3">
                        <QuestionnairStatusBadge status={q.status as QuestionnaireStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {q.updatedAt ? format(new Date(q.updatedAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontalIcon className="h-4 w-4" />
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
