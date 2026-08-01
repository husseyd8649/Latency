// lib/stats.ts
import { prisma } from "@/lib/prisma";

/** Uptime % for a set of monitor IDs over the last N hours. */
export async function uptimeForMonitors(
  monitorIds: string[],
  hours = 24
): Promise<{ uptimePct: number | null; totalChecks: number; upChecks: number }> {
  if (monitorIds.length === 0) {
    return { uptimePct: null, totalChecks: 0, upChecks: 0 };
  }
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const grouped = await prisma.check.groupBy({
    by: ["status"],
    where: { monitorId: { in: monitorIds }, checkedAt: { gte: since } },
    _count: { _all: true },
  });

  let up = 0;
  let total = 0;
  for (const g of grouped) {
    total += g._count._all;
    if (g.status === "UP") up += g._count._all;
  }

  return {
    uptimePct: total === 0 ? null : (up / total) * 100,
    totalChecks: total,
    upChecks: up,
  };
}

/** Average response time (UP checks only) over the last N hours. */
export async function avgLatency(
  monitorIds: string[],
  hours = 24
): Promise<number | null> {
  if (monitorIds.length === 0) return null;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const result = await prisma.check.aggregate({
    where: {
      monitorId: { in: monitorIds },
      checkedAt: { gte: since },
      status: "UP",
      responseTimeMs: { not: null },
    },
    _avg: { responseTimeMs: true },
  });

  const avg = result._avg.responseTimeMs;
  return avg == null ? null : Math.round(avg);
}

/**
 * Hourly average latency bins for the last 24 hours.
 * Returns 24 buckets, oldest first. Nulls for hours with no data.
 */
export async function hourlyLatency(
  monitorIds: string[]
): Promise<{ hour: string; avgMs: number | null; checks: number }[]> {
  const buckets: { hour: string; avgMs: number | null; checks: number }[] = [];
  const now = new Date();

  // Precompute empty buckets
  for (let i = 23; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    buckets.push({
      hour: start.toLocaleTimeString(undefined, { hour: "2-digit" }),
      avgMs: null,
      checks: 0,
    });
  }

  if (monitorIds.length === 0) return buckets;

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  since.setMinutes(0, 0, 0);

  const checks = await prisma.check.findMany({
    where: {
      monitorId: { in: monitorIds },
      checkedAt: { gte: since },
      responseTimeMs: { not: null },
      status: "UP",
    },
    select: { checkedAt: true, responseTimeMs: true },
  });

  // Group into per-hour sums
  const sums = new Map<number, { sum: number; count: number }>();
  for (const c of checks) {
    const bucketStart = new Date(c.checkedAt);
    bucketStart.setMinutes(0, 0, 0);
    const key = bucketStart.getTime();
    const entry = sums.get(key) ?? { sum: 0, count: 0 };
    entry.sum += c.responseTimeMs ?? 0;
    entry.count += 1;
    sums.set(key, entry);
  }

  for (let i = 0; i < 24; i++) {
    const bucketTime = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    bucketTime.setMinutes(0, 0, 0);
    const entry = sums.get(bucketTime.getTime());
    if (entry && entry.count > 0) {
      buckets[i].avgMs = Math.round(entry.sum / entry.count);
      buckets[i].checks = entry.count;
    }
  }

  return buckets;
}

/** Recent checks for a monitor, oldest first, for a sparkline. */
export async function recentChecksForSparkline(
  monitorId: string,
  take = 30
) {
  const rows = await prisma.check.findMany({
    where: { monitorId },
    orderBy: { checkedAt: "desc" },
    take,
    select: { checkedAt: true, responseTimeMs: true, status: true },
  });
  // Reverse to chronological order
  return rows.reverse().map((r) => ({
    t: r.checkedAt.getTime(),
    v: r.status === "UP" ? r.responseTimeMs : null,
  }));
}

// lib/stats.ts (append to existing file)

/** Daily uptime status for the last 30 days (oldest first). 
 * Returns array of { date: "Jan 15", up: boolean | null } 
 */
export async function dailyUptimeForMonitor(
  monitorId: string,
  days = 30
): Promise<{ date: string; up: boolean | null }[]> {
  const result: { date: string; up: boolean | null }[] = [];
  const now = new Date();

  // Precompute date labels
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      up: null,
    });
  }

  const since = new Date(now);
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const checks = await prisma.check.findMany({
    where: {
      monitorId,
      checkedAt: { gte: since },
    },
    select: {
      checkedAt: true,
      status: true,
    },
  });

  // Group by day
  const dayMap = new Map<string, { up: number; down: number }>();
  for (const c of checks) {
    const key = c.checkedAt.toISOString().split("T")[0]; // YYYY-MM-DD
    const entry = dayMap.get(key) ?? { up: 0, down: 0 };
    if (c.status === "UP") entry.up++;
    else entry.down++;
    dayMap.set(key, entry);
  }

  // Fill result
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split("T")[0];
    const entry = dayMap.get(key);
    if (entry) {
      result[i].up = entry.down === 0 ? true : entry.up > entry.down ? true : false;
    }
  }

  return result;
}