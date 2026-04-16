import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { QuestionnaireStatus, LinkStatus, QuestionStatus } from "@/types"

const questionnaireStatusConfig: Record<
  QuestionnaireStatus,
  { label: string; dot: string; className: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-muted-foreground/50",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  shared: {
    label: "Shared",
    dot: "bg-info",
    className: "bg-info/10 text-info border-info/20",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-warning",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  submitted: {
    label: "Submitted",
    dot: "bg-success",
    className: "bg-success/10 text-success border-success/20",
  },
  archived: {
    label: "Archived",
    dot: "bg-muted-foreground/30",
    className: "bg-muted text-muted-foreground/60 border-muted-foreground/10",
  },
}

const linkStatusConfig: Record<LinkStatus, { label: string; dot: string; className: string }> = {
  active: {
    label: "Active",
    dot: "bg-success",
    className: "bg-success/10 text-success border-success/20",
  },
  expired: {
    label: "Expired",
    dot: "bg-destructive",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  closed: {
    label: "Closed",
    dot: "bg-muted-foreground/50",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
}

const questionStatusConfig: Record<QuestionStatus, { label: string; dot: string; className: string }> = {
  active: {
    label: "Active",
    dot: "bg-success",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-warning",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  archived: {
    label: "Archived",
    dot: "bg-muted-foreground/30",
    className: "bg-muted text-muted-foreground/60 border-muted-foreground/10",
  },
}

export function QuestionnairStatusBadge({ status }: { status: QuestionnaireStatus }) {
  const config = questionnaireStatusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium gap-1.5", config.className)}
    >
      <span aria-hidden="true" className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </Badge>
  )
}

export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  const config = linkStatusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium gap-1.5", config.className)}
    >
      <span aria-hidden="true" className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </Badge>
  )
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const config = questionStatusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium gap-1.5", config.className)}
    >
      <span aria-hidden="true" className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </Badge>
  )
}
