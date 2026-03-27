import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { QuestionnaireStatus, LinkStatus, QuestionStatus } from "@/types"

const questionnaireStatusConfig: Record<
  QuestionnaireStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  shared: {
    label: "Shared",
    className: "bg-info/10 text-info border-info/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  submitted: {
    label: "Submitted",
    className: "bg-success/10 text-success border-success/20",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground/60 border-muted-foreground/10",
  },
}

const linkStatusConfig: Record<LinkStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-success/10 text-success border-success/20",
  },
  expired: {
    label: "Expired",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
}

const questionStatusConfig: Record<QuestionStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Inactive",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground/60 border-muted-foreground/10",
  },
}

export function QuestionnairStatusBadge({ status }: { status: QuestionnaireStatus }) {
  const config = questionnaireStatusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}

export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  const config = linkStatusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const config = questionStatusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}
