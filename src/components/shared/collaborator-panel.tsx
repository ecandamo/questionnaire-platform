"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  UsersIcon,
  PlusIcon,
  CopyIcon,
  MailIcon,
  CheckIcon,
  TrashIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react"
import { toast } from "sonner"

interface Question {
  id: string
  text: string
  type: string
  isRequired: boolean
  sortOrder: number
}

interface Collaborator {
  id: string
  email: string
  name: string | null
  token: string
  role: "owner" | "contributor"
  inviteStatus: "pending" | "active" | "completed"
  assignedCount: number
  answeredCount: number
}

interface CollaboratorPanelProps {
  responseId: string
  ownerToken: string
  questionnaireTitle: string
  questions: Question[]
}

export function CollaboratorPanel({
  responseId,
  ownerToken,
  questionnaireTitle,
  questions,
}: CollaboratorPanelProps) {
  const [collaborators, setCollaborators] = React.useState<Collaborator[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showInvite, setShowInvite] = React.useState(false)
  const [inviting, setInviting] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteName, setInviteName] = React.useState("")
  const [selectedQuestions, setSelectedQuestions] = React.useState<Set<string>>(new Set())

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "")

  const answerableQuestions = questions.filter((q) => q.type !== "section_header")

  // Determine which question IDs are already assigned to other collaborators
  const assignedToOthers = React.useMemo(() => {
    const set = new Set<string>()
    collaborators
      .filter((c) => c.role === "contributor")
      .forEach(() => {
        // We don't have per-question data at this level; backend handles conflicts.
        // For UX we just rely on the backend's response.
      })
    return set
  }, [collaborators])

  React.useEffect(() => {
    fetchCollaborators()
  }, [responseId])

  async function fetchCollaborators() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/responses/${responseId}/collaborators?token=${encodeURIComponent(ownerToken)}`
      )
      if (res.ok) {
        const data = await res.json()
        setCollaborators(data.collaborators)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || selectedQuestions.size === 0) {
      toast.error("Please enter an email and select at least one question")
      return
    }

    setInviting(true)
    try {
      const res = await fetch(`/api/responses/${responseId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ownerToken,
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          questionIds: Array.from(selectedQuestions),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to invite collaborator")
        return
      }

      toast.success(`${inviteName || inviteEmail} added as collaborator`)
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
        `/api/responses/${responseId}/collaborators?collaboratorId=${collaboratorId}&token=${encodeURIComponent(ownerToken)}`,
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

  function getCollaboratorUrl(token: string) {
    return `${appUrl}/respond/${token}`
  }

  async function copyLink(token: string, collaboratorId: string) {
    await navigator.clipboard.writeText(getCollaboratorUrl(token))
    setCopiedId(collaboratorId)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openInEmail(email: string, token: string, name: string | null) {
    const url = getCollaboratorUrl(token)
    const subject = encodeURIComponent(`Your input is needed: ${questionnaireTitle}`)
    const body = encodeURIComponent(
      `Hi ${name ?? "there"},\n\nPlease answer your assigned questions here:\n${url}\n\nThank you`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`)
  }

  function toggleQuestion(id: string) {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const contributors = collaborators.filter((c) => c.role === "contributor")
  const totalAssignedToContributors = contributors.reduce((s, c) => s + c.assignedCount, 0)
  const totalAnsweredByContributors = contributors.reduce((s, c) => s + c.answeredCount, 0)

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Team
          </span>
          {contributors.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {contributors.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setShowInvite(true)}
        >
          <PlusIcon className="h-3 w-3" />
          Add
        </Button>
      </div>

      {/* Collaborator list */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : contributors.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs text-muted-foreground">
              No team members yet. Add someone to share the workload.
            </p>
          </div>
        ) : (
          contributors.map((c) => (
            <CollaboratorRow
              key={c.id}
              collaborator={c}
              copied={copiedId === c.id}
              deleting={deletingId === c.id}
              onCopy={() => copyLink(c.token, c.id)}
              onEmail={() => openInEmail(c.email, c.token, c.name)}
              onDelete={() => handleDelete(c.id, c.email)}
            />
          ))
        )}
      </div>

      {/* Summary footer */}
      {contributors.length > 1 && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Team total</span>
          <span className="text-[10px] font-medium tabular-nums">
            {totalAnsweredByContributors}/{totalAssignedToContributors} answered
          </span>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Assign specific questions to a colleague. They'll receive a personal link scoped to
              only their questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Name (optional)</Label>
                <Input
                  placeholder="Jane Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Assign questions <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    if (selectedQuestions.size === answerableQuestions.length) {
                      setSelectedQuestions(new Set())
                    } else {
                      setSelectedQuestions(new Set(answerableQuestions.map((q) => q.id)))
                    }
                  }}
                >
                  {selectedQuestions.size === answerableQuestions.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {answerableQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => toggleQuestion(q.id)}
                  >
                    <Checkbox
                      id={`q-${q.id}`}
                      checked={selectedQuestions.has(q.id)}
                      onCheckedChange={() => toggleQuestion(q.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug line-clamp-2">
                        <span className="text-muted-foreground/50 mr-1.5 font-mono text-[10px]">{i + 1}.</span>
                        {q.text}
                        {q.isRequired && <span className="text-destructive ml-1">*</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedQuestions.size > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {selectedQuestions.size} question{selectedQuestions.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim() || selectedQuestions.size === 0}
            >
              {inviting && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Add Collaborator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Collaborator Row ─────────────────────────────────────────────────────────

function CollaboratorRow({
  collaborator,
  copied,
  deleting,
  onCopy,
  onEmail,
  onDelete,
}: {
  collaborator: Collaborator
  copied: boolean
  deleting: boolean
  onCopy: () => void
  onEmail: () => void
  onDelete: () => void
}) {
  const progress =
    collaborator.assignedCount > 0
      ? Math.round((collaborator.answeredCount / collaborator.assignedCount) * 100)
      : 0

  const statusIcon =
    collaborator.inviteStatus === "completed" ? (
      <CheckCircle2Icon className="h-3 w-3 text-[color:var(--accent)]" />
    ) : collaborator.inviteStatus === "active" ? (
      <ClockIcon className="h-3 w-3 text-amber-500" />
    ) : (
      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-0.5" />
    )

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">
        {(collaborator.name ?? collaborator.email).charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium truncate">
            {collaborator.name ?? collaborator.email}
          </p>
          {statusIcon}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 max-w-24 bg-muted rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-[color:var(--accent)] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {collaborator.answeredCount}/{collaborator.assignedCount}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="Copy link"
          onClick={onCopy}
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="Open in email"
          onClick={onEmail}
        >
          <MailIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          title="Remove collaborator"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <TrashIcon className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
