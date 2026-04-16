"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuestionnairStatusBadge } from "@/components/shared/status-badge"
import {
  ClipboardListIcon,
  PlusIcon,
} from "lucide-react"
import { format } from "date-fns"
import type { QuestionnaireStatus, QuestionnaireType } from "@/types"
import { QUESTIONNAIRE_TYPE_LABELS as TYPE_LABELS } from "@/types"

const DashboardChartBlocks = dynamic(
  () =>
    import("./dashboard-chart-blocks").then((m) => ({
      default: m.DashboardChartBlocks,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading charts">
        {[0, 1].map((i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="pb-2 border-b border-border">
              <div className="h-4 w-20 max-w-[40%] rounded bg-muted animate-pulse" aria-hidden />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[220px] rounded-lg bg-muted/40 animate-pulse" aria-hidden />
            </CardContent>
          </Card>
        ))}
        <span className="sr-only">Loading charts…</span>
      </div>
    ),
  }
)

interface Props {
  userName: string
  isAdmin: boolean
  statusCounts: Record<string, number>
  typeCounts: Record<string, number>
  recent: Array<{
    id: string
    title: string
    type: string
    status: string
    updatedAt: Date | null
  }>
  total: number
}

export function DashboardClient({ userName, isAdmin, statusCounts, typeCounts, recent, total }: Props) {
  const kpis = [
    { label: "total",       value: total,                        valueColor: "text-foreground" },
    { label: "in progress", value: statusCounts.in_progress ?? 0, valueColor: "text-warning" },
    { label: "submitted",   value: statusCounts.submitted ?? 0,   valueColor: "text-success" },
    { label: "draft",       value: statusCounts.draft ?? 0,       valueColor: "text-muted-foreground" },
  ]

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header with inline at-a-glance stats */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {userName.split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isAdmin ? "All questionnaires across the platform" : "Your questionnaires at a glance"}
          </p>
          {total > 0 && (
            <div className="flex flex-wrap items-baseline mt-2.5 divide-x divide-border text-xs">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="flex items-baseline gap-1 px-3 first:pl-0">
                  <span className={`font-bold tabular-nums ${kpi.valueColor}`}>{kpi.value}</span>
                  <span className="text-muted-foreground">{kpi.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button asChild className="shrink-0">
          <Link href="/questionnaires/new">
            <PlusIcon className="h-4 w-4" />
            New Questionnaire
          </Link>
        </Button>
      </div>

      <DashboardChartBlocks statusCounts={statusCounts} typeCounts={typeCounts} />

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader className="pb-0 border-b border-border flex flex-row items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground pb-3">
            Recent Questionnaires
          </p>
          <Button variant="ghost" size="sm" asChild className="-mt-1 -mr-2 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/questionnaires">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <ClipboardListIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No questionnaires yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create your first to get started</p>
              </div>
              <Button asChild size="sm" className="mt-1">
                <Link href="/questionnaires/new">
                  <PlusIcon className="h-4 w-4" />
                  New Questionnaire
                </Link>
              </Button>
            </div>
          ) : (
            <div>
              {recent.map((q, i) => (
                <Link
                  key={q.id}
                  href={`/questionnaires/${q.id}`}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{q.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TYPE_LABELS[q.type as QuestionnaireType] ?? q.type}
                        {q.updatedAt && (
                          <span className="text-muted-foreground/60"> · {format(new Date(q.updatedAt), "MMM d")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <QuestionnairStatusBadge status={q.status as QuestionnaireStatus} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
