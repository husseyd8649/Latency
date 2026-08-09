// app/dashboard/monitors/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { monitorSchema } from "@/lib/validation/monitor";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * Create a new monitor. Called from the Add form.
 * Returns error state on validation failure; redirects on success.
 */
export async function createMonitor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const raw = Object.fromEntries(formData.entries());
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

  await prisma.monitor.create({
    data: {
      userId: user.id,
      name: data.name,
      type: data.type,
      target: data.target,
      intervalSeconds: data.intervalSeconds,
      timeoutMs: data.timeoutMs,
      expectedStatus: data.type === "HTTP" ? data.expectedStatus : null,
      nextCheckAt: new Date(),
      regionId,
    },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  redirect("/dashboard/monitors");
}

/** Delete a monitor (owner only). */
export async function deleteMonitor(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.monitor.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}

/** Pause / resume a monitor (owner only). */
export async function togglePause(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId: user.id },
    select: { isPaused: true },
  });
  if (!monitor) return;

  await prisma.monitor.update({
    where: { id },
    data: { isPaused: !monitor.isPaused },
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
  const now = new Date();

  await prisma.monitor.updateMany({
    where: {
      userId: user.id,
      isPaused: false,
    },
    data: {
      nextCheckAt: now,
    },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}

/**
 * Delete every monitor owned by the current user. Cascades remove checks
 * and incidents.
 */
export async function deleteAllMonitors(): Promise<{ deleted: number }> {
  const user = await requireUser();

  const result = await prisma.monitor.deleteMany({
    where: { userId: user.id },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  return { deleted: result.count };
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
    select: { type: true },
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

  await prisma.monitor.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      target: parsed.data.target,
      intervalSeconds: parsed.data.intervalSeconds,
      timeoutMs: parsed.data.timeoutMs,
      expectedStatus:
        existing.type === "HTTP" ? parsed.data.expectedStatus ?? 200 : null,
      regionId,
    },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------- Bulk interval update -------------------------------------------

/**
 /**
 * Bulk update all monitors owned by the current user to a given interval.
 * Also re-staggers nextCheckAt across the new interval window to avoid a burst.
 */
export async function bulkUpdateInterval(formData: FormData): Promise<void> {
  const user = await requireUser();
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

  // Use the interactive transaction form so we can set a longer timeout.
  // 500 individual updates take a while — 30s ceiling is generous.
  await prisma.$transaction(
    async (tx) => {
      // First, set intervalSeconds for everyone in one query
      await tx.monitor.updateMany({
        where: { userId: user.id },
        data: { intervalSeconds: seconds },
      });

      // Then stagger nextCheckAt — this still needs per-row updates because
      // each row gets a different timestamp. Batch them sequentially inside
      // the transaction so they share one connection.
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

  // Find all open incidents for this user
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

  // Fetch the most recent check for each involved monitor in one query
  const monitorIds = Array.from(new Set(open.map((i) => i.monitorId)));

  // Get latest check per monitor. Use a groupBy trick or fetch top check for each.
  // Simpler and fast enough at this scale: fetch all recent checks, keep first per monitor.
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

  // Determine which incidents should be closed
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

  // Update in batches to avoid holding a single long transaction
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

  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard");
  return { scanned: open.length, resolved: toClose.length };
}