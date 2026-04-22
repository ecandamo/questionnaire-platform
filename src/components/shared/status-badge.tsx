import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  QUESTIONNAIRE_STATUS_LABELS,
  type QuestionnaireStatus,
  type LinkStatus,
  type QuestionStatus,
} from "@/types"

const LINK_LABELS: Record<LinkStatus, string> = {
  active: "Active",
  expired: "Expired",
  closed: "Closed",
}

const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
}

function StatusDot() {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 shrink-0 rounded-full bg-current opacity-90"
    />
  )
}

const questionnaireVariant: Record<
  QuestionnaireStatus,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  draft: { variant: "outline", className: "text-muted-foreground border-muted-foreground/25" },
  shared: { variant: "info" },
  in_progress: { variant: "warning" },
  submitted: { variant: "success" },
  archived: { variant: "outline", className: "text-muted-foreground/80 border-muted-foreground/15" },
}

const linkVariant: Record<
  LinkStatus,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  active: { variant: "success" },
  expired: { variant: "destructive" },
  closed: { variant: "outline", className: "text-muted-foreground border-muted-foreground/25" },
}

const questionVariant: Record<
  QuestionStatus,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  active: { variant: "success" },
  inactive: { variant: "warning" },
  archived: { variant: "outline", className: "text-muted-foreground/80 border-muted-foreground/15" },
}

export function QuestionnairStatusBadge({ status }: { status: QuestionnaireStatus }) {
  const { variant, className } = questionnaireVariant[status]
  return (
    <Badge variant={variant} className={cn("text-xs font-semibold gap-1.5", className)}>
      <StatusDot />
      {QUESTIONNAIRE_STATUS_LABELS[status]}
    </Badge>
  )
}

export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  const { variant, className } = linkVariant[status]
  return (
    <Badge variant={variant} className={cn("text-xs font-semibold gap-1.5", className)}>
      <StatusDot />
      {LINK_LABELS[status]}
    </Badge>
  )
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const { variant, className } = questionVariant[status]
  return (
    <Badge variant={variant} className={cn("text-xs font-semibold gap-1.5", className)}>
      <StatusDot />
      {QUESTION_STATUS_LABELS[status]}
    </Badge>
  )
}
