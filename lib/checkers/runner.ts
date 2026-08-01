// lib/checkers/runner.ts
import { prisma } from "@/lib/prisma";
import type { Monitor } from "@prisma/client";
import { checkHttp } from "./http";
import { checkTcp } from "./tcp";
import { checkSsl } from "./ssl";
import type { CheckResult } from "./http";
import { fanOutEvent } from "@/lib/webhooks";

type OpenedIncident = { id: string; startedAt: Date; cause: string | null };
type ResolvedIncident = {
  id: string;
  startedAt: Date;
  resolvedAt: Date;
  cause: string | null;
};

export async function runMonitorCheck(monitor: Monitor): Promise<CheckResult> {
  let result: CheckResult;

  switch (monitor.type) {
    case "HTTP":
      result = await checkHttp({
        url: monitor.target,
        timeoutMs: monitor.timeoutMs,
        expectedStatus: monitor.expectedStatus ?? 200,
      });
      break;
    case "TCP":
      result = await checkTcp({
        target: monitor.target,
        timeoutMs: monitor.timeoutMs,
      });
      break;
    case "SSL":
      result = await checkSsl({
        hostname: monitor.target,
        timeoutMs: monitor.timeoutMs,
      });
      break;
  }

  const now = new Date();
  const nextCheckAt = new Date(now.getTime() + monitor.intervalSeconds * 1000);

  // Query previous state OUTSIDE the transaction — no need for transactional
  // consistency and this reduces the transaction's total round-trip time.
  const previous = await prisma.check.findFirst({
    where: { monitorId: monitor.id },
    orderBy: { checkedAt: "desc" },
    select: { status: true },
  });

  const wasUp = previous?.status === "UP" || previous == null;
  const isUp = result.status === "UP";
  const shouldOpenIncident = wasUp && !isUp;
  const shouldResolveIncident = !wasUp && isUp;

  // If we're going to resolve an incident, find it BEFORE the transaction.
  let openIncidentId: string | null = null;
  if (shouldResolveIncident) {
    const open = await prisma.incident.findFirst({
      where: { monitorId: monitor.id, resolvedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    openIncidentId = open?.id ?? null;
  }

  const transitions: {
    opened: OpenedIncident | null;
    resolved: ResolvedIncident | null;
  } = { opened: null, resolved: null };

  // Transaction now only does WRITES — much faster, less likely to timeout.
  // Also bumped timeout to 15s as safety margin.
  await prisma.$transaction(
    async (tx) => {
      await tx.check.create({
        data: {
          monitorId: monitor.id,
          status: result.status,
          responseTimeMs: result.responseTimeMs,
          statusCode: result.statusCode,
          error: result.error,
          checkedAt: now,
        },
      });

      await tx.monitor.update({
        where: { id: monitor.id },
        data: { lastCheckedAt: now, nextCheckAt },
      });

      if (shouldOpenIncident) {
        const created = await tx.incident.create({
          data: {
            monitorId: monitor.id,
            startedAt: now,
            cause: result.error ?? "Check failed",
          },
        });
        transitions.opened = {
          id: created.id,
          startedAt: created.startedAt,
          cause: created.cause,
        };
      } else if (shouldResolveIncident && openIncidentId) {
        const updated = await tx.incident.update({
          where: { id: openIncidentId },
          data: { resolvedAt: now },
        });
        if (updated.resolvedAt) {
          transitions.resolved = {
            id: updated.id,
            startedAt: updated.startedAt,
            resolvedAt: updated.resolvedAt,
            cause: updated.cause,
          };
        }
      }
    },
    {
      timeout: 15000, // Bump from default 5s to 15s
      maxWait: 10000, // Bump from default 2s to 10s
    }
  );

  // Fire webhooks after commit (fire-and-forget)
  const opened = transitions.opened;
  if (opened) {
    fanOutEvent(monitor.userId, "incident.started", {
      monitor: {
        id: monitor.id,
        name: monitor.name,
        type: monitor.type,
        target: monitor.target,
      },
      incident: {
        id: opened.id,
        startedAt: opened.startedAt.toISOString(),
        resolvedAt: null,
        cause: opened.cause,
      },
    });
  }

  const resolved = transitions.resolved;
  if (resolved) {
    fanOutEvent(monitor.userId, "incident.resolved", {
      monitor: {
        id: monitor.id,
        name: monitor.name,
        type: monitor.type,
        target: monitor.target,
      },
      incident: {
        id: resolved.id,
        startedAt: resolved.startedAt.toISOString(),
        resolvedAt: resolved.resolvedAt.toISOString(),
        cause: resolved.cause,
      },
    });
  }

  return result;
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function next(): Promise<void> {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;
      try {
        results[current] = await worker(items[current]);
      } catch (err) {
        results[current] = err as R;
      }
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, next);
  await Promise.all(runners);
  return results;
}