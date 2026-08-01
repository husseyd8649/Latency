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
      nextCheckAt: new Date(), // eligible immediately (Phase 4 will use this)
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

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}
