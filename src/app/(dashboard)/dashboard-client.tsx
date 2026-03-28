"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QuestionnairStatusBadge } from "@/components/shared/status-badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  ClipboardListIcon,
  PlusIcon,
} from "lucide-react"
import { format } from "date-fns"
import type { QuestionnaireStatus, QuestionnaireType, QUESTIONNAIRE_TYPE_LABELS } from "@/types"
import { QUESTIONNAIRE_STATUS_LABELS, QUESTIONNAIRE_TYPE_LABELS as TYPE_LABELS } from "@/types"

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

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--color-muted-foreground)",
  shared: "var(--color-info)",
  in_progress: "var(--color-warning)",
  submitted: "var(--color-success)",
  archived: "var(--color-muted-foreground)",
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

export function DashboardClient({ userName, isAdmin, statusCounts, typeCounts, recent, total }: Props) {
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: QUESTIONNAIRE_STATUS_LABELS[status as QuestionnaireStatus] ?? status,
    value: count,
    fill: STATUS_COLORS[status] ?? "var(--color-chart-1)",
  }))

  const typeData = Object.entries(typeCounts).map(([type, count]) => ({
    name: TYPE_LABELS[type as QuestionnaireType] ?? type,
    count,
  }))

  const kpis = [
    {
      label: "Total",
      value: total,
      accent: "border-l-primary",
      valueColor: "text-foreground",
    },
    {
      label: "In Progress",
      value: statusCounts.in_progress ?? 0,
      accent: "border-l-warning",
      valueColor: "text-foreground",
    },
    {
      label: "Submitted",
      value: statusCounts.submitted ?? 0,
      accent: "border-l-success",
      valueColor: "text-foreground",
    },
    {
      label: "Draft",
      value: statusCounts.draft ?? 0,
      accent: "border-l-muted-foreground/30",
      valueColor: "text-foreground",
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            {isAdmin ? "Platform Overview" : `Welcome back, ${userName.split(" ")[0]}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isAdmin ? "All questionnaires across the platform" : "Your questionnaires at a glance"}
          </p>
        </div>
        <Button asChild>
          <Link href="/questionnaires/new">
            <PlusIcon className="h-4 w-4" />
            New Questionnaire
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`shadow-card border-l-2 ${kpi.accent} hover:shadow-card-hover transition-shadow`}>
            <CardContent className="pt-5 pb-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {kpi.label}
              </p>
              <p className={`text-4xl font-bold font-heading tracking-tight mt-2 ${kpi.valueColor}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Pie */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="pb-2 border-b border-border">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              By Status
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {statusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Type Bar */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="pb-2 border-b border-border">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              By Type
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {typeData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", radius: 4 }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader className="pb-0 border-b border-border flex flex-row items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground pb-3">
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
