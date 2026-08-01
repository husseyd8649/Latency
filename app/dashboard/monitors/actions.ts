// app/dashboard/monitors/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { monitorSchema } from "@/lib/validation/monitor";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
 * and incidents. Requires the client to have prompted for confirmation.
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

import { z } from "zod";

// Edit schema — cannot change type (would break check history)
const editSchema = z
  .object({
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

type EditState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

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
      if (typeof p === "string" && !fieldErrors[p]) fieldErrors[p] = issue.message;
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  // Verify ownership + fetch type to decide expectedStatus applicability
  const existing = await prisma.monitor.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { type: true },
  });
  if (!existing) return { error: "Monitor not found." };

  await prisma.monitor.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      target: parsed.data.target,
      intervalSeconds: parsed.data.intervalSeconds,
      timeoutMs: parsed.data.timeoutMs,
      expectedStatus:
        existing.type === "HTTP"
          ? parsed.data.expectedStatus ?? 200
          : null,
    },
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
  return { ok: true };
}
