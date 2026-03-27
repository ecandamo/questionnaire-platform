import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"

interface AuditParams {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

export async function logAudit(params: AuditParams) {
  try {
    await db.insert(auditLog).values({
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress ?? null,
    })
  } catch {
    // Audit failures should not crash the application
    console.error("Audit log failed:", params)
  }
}
