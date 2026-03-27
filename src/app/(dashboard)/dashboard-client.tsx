"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  TrendingUpIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
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
      icon: ClipboardListIcon,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "In Progress",
      value: statusCounts.in_progress ?? 0,
      icon: ClockIcon,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Submitted",
      value: statusCounts.submitted ?? 0,
      icon: CheckCircle2Icon,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Draft",
      value: statusCounts.draft ?? 0,
      icon: FileTextIcon,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">
            {isAdmin ? "Platform Overview" : `Welcome back, ${userName.split(" ")[0]}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="shadow-card">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                    <p className="text-3xl font-bold font-heading tracking-tight mt-1">
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Pie */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base font-semibold">By Status</CardTitle>
          </CardHeader>
          <CardContent>
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
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Type Bar */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base font-semibold">By Type</CardTitle>
          </CardHeader>
          <CardContent>
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-base font-semibold">Recent Questionnaires</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/questionnaires">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <ClipboardListIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No questionnaires yet</p>
              <Button asChild size="sm">
                <Link href="/questionnaires/new">
                  <PlusIcon className="h-4 w-4" />
                  Create your first questionnaire
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((q) => (
                <Link
                  key={q.id}
                  href={`/questionnaires/${q.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ClipboardListIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{q.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TYPE_LABELS[q.type as QuestionnaireType] ?? q.type}
                        {q.updatedAt && ` · ${format(new Date(q.updatedAt), "MMM d")}`}
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
