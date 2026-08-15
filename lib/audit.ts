import { prisma } from "./prisma";

export type AuditAction = 
  | "MONITOR_CREATE" | "MONITOR_UPDATE" | "MONITOR_DELETE" | "MONITOR_PAUSE" | "MONITOR_RESUME"
  | "INCIDENT_ACK" | "INCIDENT_RESOLVE"
  | "STATUS_PAGE_CREATE" | "STATUS_PAGE_UPDATE" | "STATUS_PAGE_DELETE"
  | "WEBHOOK_CREATE" | "WEBHOOK_DELETE"
  | "REGION_CREATE" | "REGION_DELETE"
  | "BULK_INTERVAL_UPDATE" | "RECONCILE_INCIDENTS";

export async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  req,
}: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  req?: Request;
}): Promise<void> {
  try {
    // Truncate large objects to prevent DB bloat
    const truncate = (obj: unknown): unknown => {
      if (!obj) return obj;
      const str = JSON.stringify(obj);
      if (str.length > 10000) {
        return { _truncated: true, preview: str.substring(0, 500) + "..." };
      }
      return obj;
    };

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId || null,
        oldValue: truncate(oldValue) as any,
        newValue: truncate(newValue) as any,
        ipAddress: req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req?.headers?.get("x-real-ip") || 
                   "unknown",
        userAgent: req?.headers?.get("user-agent") || "unknown",
        // metadata removed - not in schema
      },
    });
  } catch (e) {
    // Fail silently - never break user operations for audit failures
    console.error("Audit log failed:", e);
  }
}