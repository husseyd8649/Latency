"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { monitorSchema } from "@/lib/validation/monitor";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { headers } from "next/headers";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

// Helper to get request headers in server actions
async function getReqHeaders() {
  const headersList = await headers();
  return {
    get(name: string): string | null {
      return headersList.get(name);
    },
  } as Headers;
}

/**
 * Create a new monitor. Called from the Add form.
 * Returns error state on validation failure; redirects on success.
 */
export async function createMonitor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();
  
  const raw = Object.fromEntries(formData.entries());
  
  // Handle checkboxes (they only appear in formData when checked)
  const accept401 = formData.get("accept401") === "on";
  const accept403 = formData.get("accept403") === "on";
  const accept429 = formData.get("accept429") === "on";
  
  const parsed = monitorSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const data = parsed.data;
  const regionId = (formData.get("regionId") as string) || null;

  // Verify region belongs to user if provided
  if (regionId) {
    const region = await prisma.region.findFirst({
      where: { id: regionId, userId: user.id },
    });
    if (!region) {
      return { error: "Selected region not found" };
    }
  }

  const monitor = await prisma.monitor.create({
    data: {
      userId: user.id,
      name: data.name,
      type: data.type,
      target: data.target,
      intervalSeconds: data.intervalSeconds,
      timeoutMs: data.timeoutMs,
      expectedStatus: data.type === "HTTP" ? data.expectedStatus : null,
      accept401: data.type === "HTTP" ? accept401 : false,
      accept403: data.type === "HTTP" ? accept403 : false,
      accept429: data.type === "HTTP" ? accept429 : false,
      nextCheckAt: new Date(),
      regionId,
    },
  });

  // Audit log
  await logAuditEvent({
    userId: user.id,
    action: "MONITOR_CREATE",
    entityType: "Monitor",
    entityId: monitor.id,
    newValue: { 
      name: monitor.name, 
      target: monitor.target, 
      type: monitor.type,
      intervalSeconds: monitor.intervalSeconds 
    },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  redirect("/dashboard/monitors");
}

export async function toggleMonitorProtection(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const isProtected = formData.get("isProtected") === "true";

  if (!id) return;

  await prisma.monitor.updateMany({
    where: { id, userId: user.id },
    data: { isProtected },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}


/** Delete a monitor (owner only). */
export async function deleteMonitor(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  
  if (!id) return;

  // Check if protected
  const monitor = await prisma.monitor.findFirst({
    where: { id, userId: user.id },
    select: { isProtected: true, name: true },
  });

  if (monitor?.isProtected) {
    throw new Error(`Cannot delete protected monitor: ${monitor.name}`);
  }

  await prisma.monitor.deleteMany({
    where: { id, userId: user.id, isProtected: false },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}


/** Pause / resume a monitor (owner only). */
export async function togglePause(formData: FormData) {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId: user.id },
    select: { id: true, isPaused: true, name: true },
  });
  if (!monitor) return;

  const newPausedState = !monitor.isPaused;
  
  await prisma.monitor.update({
    where: { id },
    data: { isPaused: newPausedState },
  });

  await logAuditEvent({
    userId: user.id,
    action: newPausedState ? "MONITOR_PAUSE" : "MONITOR_RESUME",
    entityType: "Monitor",
    entityId: monitor.id,
    oldValue: { isPaused: monitor.isPaused },
    newValue: { isPaused: newPausedState },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}

/**
 * Mark every non-paused monitor as immediately due so the next cron tick
 * processes them.
 */
export async function runAllMonitors(): Promise<void> {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();
  const now = new Date();

  const result = await prisma.monitor.updateMany({
    where: {
      userId: user.id,
      isPaused: false,
    },
    data: {
      nextCheckAt: now,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "MONITOR_UPDATE",
    entityType: "Monitor",
    newValue: { action: "RUN_ALL_NOW", affectedCount: result.count },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}

/**
 * Delete every monitor owned by the current user. Cascades remove checks
 * and incidents.
 */
export async function deleteAllMonitors(): Promise<{ deleted: number; protected: number }> {
  "use server";
  const user = await requireUser();

  // Count protected first
  const protectedCount = await prisma.monitor.count({
    where: { userId: user.id, isProtected: true },
  });

  // Delete only unprotected
  const result = await prisma.monitor.deleteMany({
    where: { userId: user.id, isProtected: false },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  return { deleted: result.count, protected: protectedCount };
}

// ---------- Edit ------------------------------------------------------------

const editSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(80),
  target: z.string().trim().min(1, "Target is required").max(500),
  intervalSeconds: z.coerce
    .number()
    .int()
    .min(60, "Minimum 60 seconds")
    .max(86400, "Maximum 24 hours"),
  timeoutMs: z.coerce
    .number()
    .int()
    .min(1000, "Minimum 1000 ms")
    .max(60000, "Maximum 60000 ms"),
  expectedStatus: z.coerce
    .number()
    .int()
    .min(100)
    .max(599)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

type EditState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

/**
 * Update editable fields of a monitor. Type is intentionally not changeable.
 */
export async function editMonitor(
  _prev: EditState,
  formData: FormData
): Promise<EditState> {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();

  // Handle checkboxes
  const accept401 = formData.get("accept401") === "on";
  const accept403 = formData.get("accept403") === "on";
  const accept429 = formData.get("accept429") === "on";

  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    target: formData.get("target"),
    intervalSeconds: formData.get("intervalSeconds"),
    timeoutMs: formData.get("timeoutMs"),
    expectedStatus: formData.get("expectedStatus") ?? "",
  };

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const p = issue.path[0];
      if (typeof p === "string" && !fieldErrors[p]) {
        fieldErrors[p] = issue.message;
      }
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const existing = await prisma.monitor.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { 
      type: true, 
      name: true, 
      target: true, 
      intervalSeconds: true, 
      timeoutMs: true,
      expectedStatus: true,
      accept401: true,
      accept403: true,
      accept429: true,
      regionId: true,
    },
  });
  if (!existing) return { error: "Monitor not found." };

  const regionId = (formData.get("regionId") as string) || null;

  // Verify region belongs to user if provided
  if (regionId) {
    const region = await prisma.region.findFirst({
      where: { id: regionId, userId: user.id },
    });
    if (!region) {
      return { error: "Selected region not found" };
    }
  }

  const updated = await prisma.monitor.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      target: parsed.data.target,
      intervalSeconds: parsed.data.intervalSeconds,
      timeoutMs: parsed.data.timeoutMs,
      expectedStatus: existing.type === "HTTP" ? parsed.data.expectedStatus ?? 200 : null,
      accept401: existing.type === "HTTP" ? accept401 : false,
      accept403: existing.type === "HTTP" ? accept403 : false,
      accept429: existing.type === "HTTP" ? accept429 : false,
      regionId,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "MONITOR_UPDATE",
    entityType: "Monitor",
    entityId: parsed.data.id,
    oldValue: {
      name: existing.name,
      target: existing.target,
      intervalSeconds: existing.intervalSeconds,
      timeoutMs: existing.timeoutMs,
      expectedStatus: existing.expectedStatus,
      accept401: existing.accept401,
      accept403: existing.accept403,
      accept429: existing.accept429,
      regionId: existing.regionId,
    },
    newValue: {
      name: updated.name,
      target: updated.target,
      intervalSeconds: updated.intervalSeconds,
      timeoutMs: updated.timeoutMs,
      expectedStatus: updated.expectedStatus,
      accept401: updated.accept401,
      accept403: updated.accept403,
      accept429: updated.accept429,
      regionId: updated.regionId,
    },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------- Bulk interval update -------------------------------------------

/**
 * Bulk update all monitors owned by the current user to a given interval.
 * Also re-staggers nextCheckAt across the new interval window to avoid a burst.
 */
export async function bulkUpdateInterval(formData: FormData): Promise<void> {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();
  const seconds = Number(formData.get("seconds") ?? 900);

  if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400) return;

  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (monitors.length === 0) return;

  const now = new Date();
  const bucket = seconds / monitors.length;

  await prisma.$transaction(
    async (tx) => {
      await tx.monitor.updateMany({
        where: { userId: user.id },
        data: { intervalSeconds: seconds },
      });

      for (let i = 0; i < monitors.length; i++) {
        await tx.monitor.update({
          where: { id: monitors[i].id },
          data: {
            nextCheckAt: new Date(now.getTime() + Math.floor(i * bucket * 1000)),
          },
        });
      }
    },
    { timeout: 60000, maxWait: 15000 }
  );

  await logAuditEvent({
    userId: user.id,
    action: "BULK_INTERVAL_UPDATE",
    entityType: "Monitor",
    newValue: { intervalSeconds: seconds, affectedCount: monitors.length },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}

// ---------- Incident reconciliation ----------------------------------------

/**
 * Close open incidents whose monitor's most recent check is UP.
 * Uses the most recent check's timestamp as the resolvedAt.
 * Safe to run repeatedly.
 */
export async function reconcileIncidents(): Promise<{
  scanned: number;
  resolved: number;
}> {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();

  const open = await prisma.incident.findMany({
    where: {
      resolvedAt: null,
      monitor: { userId: user.id },
    },
    select: {
      id: true,
      monitorId: true,
    },
  });

  if (open.length === 0) {
    return { scanned: 0, resolved: 0 };
  }

  const monitorIds = Array.from(new Set(open.map((i) => i.monitorId)));

  const latestChecks = await prisma.check.findMany({
    where: { monitorId: { in: monitorIds } },
    orderBy: { checkedAt: "desc" },
    distinct: ["monitorId"],
    select: {
      monitorId: true,
      status: true,
      checkedAt: true,
    },
  });

  const latestByMonitor = new Map(
    latestChecks.map((c) => [c.monitorId, c])
  );

  const toClose: { id: string; resolvedAt: Date }[] = [];
  for (const incident of open) {
    const latest = latestByMonitor.get(incident.monitorId);
    if (latest && latest.status === "UP") {
      toClose.push({ id: incident.id, resolvedAt: latest.checkedAt });
    }
  }

  if (toClose.length === 0) {
    revalidatePath("/dashboard/incidents");
    revalidatePath("/dashboard");
    return { scanned: open.length, resolved: 0 };
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < toClose.length; i += BATCH_SIZE) {
    const batch = toClose.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      async (tx) => {
        for (const { id, resolvedAt } of batch) {
          await tx.incident.update({
            where: { id },
            data: { resolvedAt },
          });
        }
      },
      { timeout: 30000, maxWait: 10000 }
    );
  }

  await logAuditEvent({
    userId: user.id,
    action: "RECONCILE_INCIDENTS",
    entityType: "Incident",
    newValue: { scanned: open.length, resolved: toClose.length },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard");
  return { scanned: open.length, resolved: toClose.length };
}

// ---------- Run failed monitors ---------------------------------------------

/**
 * Mark every monitor with an open incident whose cause contains "fetch failed"
 * (case-insensitive) as immediately due. Returns the number queued.
 */
export async function runFailedMonitors(): Promise<{ queued: number }> {
  const user = await requireUser();
  const reqHeaders = await getReqHeaders();

  const failedIncidents = await prisma.incident.findMany({
    where: {
      resolvedAt: null,
      monitor: { userId: user.id },
      cause: { contains: "fetch failed", mode: "insensitive" },
    },
    select: { monitorId: true },
  });

  if (failedIncidents.length === 0) {
    return { queued: 0 };
  }

  const monitorIds = Array.from(
    new Set(failedIncidents.map((i) => i.monitorId))
  );

  const result = await prisma.monitor.updateMany({
    where: {
      id: { in: monitorIds },
      userId: user.id,
      isPaused: false,
    },
    data: { nextCheckAt: new Date() },
  });

  await logAuditEvent({
    userId: user.id,
    action: "MONITOR_UPDATE",
    entityType: "Monitor",
    newValue: { action: "RUN_FAILED", queued: result.count },
    req: reqHeaders as any,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard/incidents");

  return { queued: result.count };
}