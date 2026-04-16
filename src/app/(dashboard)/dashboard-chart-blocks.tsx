"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
} from "recharts"
import type { QuestionnaireStatus, QuestionnaireType } from "@/types"
import { QUESTIONNAIRE_STATUS_LABELS, QUESTIONNAIRE_TYPE_LABELS as TYPE_LABELS } from "@/types"

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--color-muted-foreground)",
  shared: "var(--color-info)",
  in_progress: "var(--color-warning)",
  submitted: "var(--color-success)",
  archived: "var(--color-muted-foreground)",
}

export function DashboardChartBlocks({
  statusCounts,
  typeCounts,
}: {
  statusCounts: Record<string, number>
  typeCounts: Record<string, number>
}) {
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: QUESTIONNAIRE_STATUS_LABELS[status as QuestionnaireStatus] ?? status,
    value: count,
    fill: STATUS_COLORS[status] ?? "var(--color-chart-1)",
  }))

  const typeData = Object.entries(typeCounts).map(([type, count]) => ({
    name: TYPE_LABELS[type as QuestionnaireType] ?? type,
    count,
  }))

  const typeChartId = "dashboard-type-chart"

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Status Pie */}
      <Card className="shadow-card hover:shadow-card-hover transition-shadow">
        <CardHeader className="pb-2 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground">By Status</p>
        </CardHeader>
        <CardContent className="pt-4">
          {statusData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            <div>
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
                      <Cell key={`cell-${i}`} fill={entry.fill} />
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
                </PieChart>
              </ResponsiveContainer>
              <ul
                role="list"
                aria-label="Questionnaire status breakdown"
                className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 px-2 text-xs text-muted-foreground"
              >
                {statusData.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
                      style={{ backgroundColor: entry.fill }}
                      aria-hidden
                    />
                    <span className="text-foreground">{entry.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Type Bar */}
      <Card className="shadow-card hover:shadow-card-hover transition-shadow">
        <CardHeader className="pb-2 border-b border-border">
          <p id={typeChartId} className="text-xs font-semibold text-muted-foreground">
            By Type
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {typeData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            <div aria-labelledby={typeChartId}>
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
              <table className="sr-only">
                <caption>Questionnaires by type</caption>
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {typeData.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
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
