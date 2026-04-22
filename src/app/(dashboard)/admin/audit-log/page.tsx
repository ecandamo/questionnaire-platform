"use client"

import * as React from "react"
import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ActivityIcon, Loader2Icon } from "lucide-react"
import { format } from "date-fns"

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  userId: string | null
  userName: string | null
  userEmail: string | null
}

const ACTION_BADGE_VARIANT: Record<
  string,
  NonNullable<ComponentProps<typeof Badge>["variant"]>
> = {
  create: "success",
  update: "info",
  delete: "destructive",
  archive: "warning",
  publish: "default",
  submit: "success",
  reopen: "warning",
  duplicate: "secondary",
  create_user: "info",
  deactivate: "destructive",
}

export default function AuditLogPage() {
  const [logs, setLogs] = React.useState<AuditEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [offset, setOffset] = React.useState(0)
  const limit = 50

  const load = React.useCallback(
    async (o = 0, signal?: AbortSignal) => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/admin/audit-log?limit=${limit}&offset=${o}`,
          { signal }
        )
        if (signal?.aborted) return
        if (res.ok) {
          const data = await res.json()
          if (signal?.aborted) return
          if (o === 0) {
            setLogs(data)
          } else {
            setLogs((prev) => [...prev, ...data])
          }
          setOffset(o)
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        throw e
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [limit]
  )

  React.useEffect(() => {
    const controller = new AbortController()
    void load(0, controller.signal)
    return () => controller.abort()
  }, [load])

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="text-sm text-muted-foreground mt-1">All user actions across the platform</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ActivityIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm">No audit entries yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                        </td>
                        <td className="px-4 py-3">
                          {log.userName ? (
                            <div>
                              <p className="font-medium text-xs">{log.userName}</p>
                              <p className="text-muted-foreground text-xs">{log.userEmail}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={ACTION_BADGE_VARIANT[log.action] ?? "outline"}
                            className="text-xs capitalize"
                          >
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          <span className="capitalize">{log.entityType.replace(/_/g, " ")}</span>
                          {log.entityId && (
                            <span className="ml-1 font-mono text-muted-foreground/60">
                              ({log.entityId.slice(0, 8)})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono max-w-xs truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length >= limit && (
                <div className="px-4 py-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => load(offset + limit)}
                    disabled={loading}
                  >
                    {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
