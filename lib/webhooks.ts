// lib/webhooks.ts
import crypto from "node:crypto";
import { prisma } from "./prisma";

export const WEBHOOK_EVENTS = ["incident.started", "incident.resolved", "webhook.test"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Generate a secure random secret. Returned as base64url. */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Sign a payload with the webhook secret using HMAC-SHA256. */
export function signPayload(secret: string, body: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

/** Mask a secret for display (show first 6 and last 4 chars). */
export function maskSecret(secret: string): string {
  if (secret.length <= 10) return "•".repeat(secret.length);
  return `${secret.slice(0, 6)}${"•".repeat(20)}${secret.slice(-4)}`;
}

type WebhookPayload = {
  event: WebhookEvent;
  deliveredAt: string;
  monitor?: {
    id: string;
    name: string;
    type: string;
    target: string;
  };
  incident?: {
    id: string;
    startedAt: string;
    resolvedAt: string | null;
    cause: string | null;
  };
  test?: boolean;
};

/**
 * Fire-and-forget webhook delivery. Errors are logged, never thrown.
 * The caller should not await this in performance-critical paths.
 */
export async function deliverWebhook(
  webhookId: string,
  payload: WebhookPayload
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const wh = await prisma.webhook.findUnique({
    where: { id: webhookId },
    select: { url: true, secret: true, isActive: true, events: true },
  });
  if (!wh || !wh.isActive) return { ok: false, error: "Webhook not active" };
// Test events always allowed; real events must be subscribed

if (payload.event !== "webhook.test" && !wh.events.includes(payload.event)) {
  return { ok: false, error: "Not subscribed" };
}
  const body = JSON.stringify(payload);
  const signature = signPayload(wh.secret, body);
  const deliveryId = crypto.randomUUID();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Latency-Webhook/1.0",
        "X-Latency-Signature": signature,
        "X-Latency-Event": payload.event,
        "X-Latency-Delivery": deliveryId,
      },
      body,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fan out an event to all matching webhooks for a user.
 * Fire-and-forget: does not await, does not throw.
 */
export function fanOutEvent(
  userId: string,
  event: WebhookEvent,
  extras: Omit<WebhookPayload, "event" | "deliveredAt">
): void {
  const payload: WebhookPayload = {
    ...extras,
    event,
    deliveredAt: new Date().toISOString(),
  };

  // Fire in the background, don't block caller
  void (async () => {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          userId,
          isActive: true,
          events: { has: event },
        },
        select: { id: true },
      });
      await Promise.allSettled(
        webhooks.map((w) => deliverWebhook(w.id, payload))
      );
    } catch (err) {
      console.error("[webhook fanout error]", err);
    }
  })();
}