// app/dashboard/webhooks/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateWebhookSecret, deliverWebhook, WEBHOOK_EVENTS } from "@/lib/webhooks";

const createSchema = z.object({
  url: z.string().url("Must be a valid URL, e.g. https://example.com/webhook"),
  events: z.array(z.enum(["incident.started", "incident.resolved"])).min(1, "Select at least one event"),
});

type CreateState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  createdSecret?: string; // shown once
  createdId?: string;
};

export async function createWebhook(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  const user = await requireUser();

  const raw = {
    url: formData.get("url"),
    events: formData.getAll("events"),
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const p = issue.path[0];
      if (typeof p === "string" && !fieldErrors[p]) fieldErrors[p] = issue.message;
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const secret = generateWebhookSecret();

  const wh = await prisma.webhook.create({
    data: {
      userId: user.id,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/webhooks");
  return { createdSecret: secret, createdId: wh.id };
}

export async function deleteWebhook(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.webhook.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/webhooks");
}

export async function toggleWebhook(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const wh = await prisma.webhook.findFirst({
    where: { id, userId: user.id },
    select: { isActive: true },
  });
  if (!wh) return;

  await prisma.webhook.update({
    where: { id },
    data: { isActive: !wh.isActive },
  });
  revalidatePath("/dashboard/webhooks");
}

type TestState = { ok?: boolean; status?: number; error?: string };

export async function testWebhook(
  _prev: TestState,
  formData: FormData
): Promise<TestState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing webhook id" };

  const wh = await prisma.webhook.findFirst({
    where: { id, userId: user.id },
  });
  if (!wh) return { error: "Not found" };

  const result = await deliverWebhook(wh.id, {
    event: "webhook.test",
    deliveredAt: new Date().toISOString(),
    test: true,
  });

  return result;
}