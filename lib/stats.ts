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
 * Aggregates in Postgres to avoid loading all check rows into memory.
 */
export async function hourlyLatency(
  monitorIds: string[],
  hours: number = 24
): Promise<{ hour: string; avgMs: number | null; checks: number }[]> {
  const buckets: { hour: string; avgMs: number | null; checks: number }[] = [];
  const now = new Date();

  // Build empty buckets based on hours requested
  const bucketCount = Math.min(hours, 24);
  for (let i = bucketCount - 1; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    buckets.push({
      hour: start.toLocaleTimeString(undefined, { hour: "2-digit" }),
      avgMs: null,
      checks: 0,
    });
  }

  if (monitorIds.length === 0) return buckets;

  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  since.setMinutes(0, 0, 0);

  // Aggregate per-hour in Postgres
  const rows = await prisma.$queryRaw<
    { bucket: Date; avg_ms: number | null; count: bigint }[]
  >`
    SELECT
      date_trunc('hour', "checkedAt") as bucket,
      AVG("responseTimeMs")::float as avg_ms,
      COUNT(*)::bigint as count
    FROM "Check"
    WHERE "monitorId" = ANY(${monitorIds}::text[])
      AND "checkedAt" >= ${since}
      AND "status" = 'UP'
      AND "responseTimeMs" IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const bucketByKey = new Map<number, { avgMs: number; count: number }>();
  for (const r of rows) {
    bucketByKey.set(r.bucket.getTime(), {
      avgMs: r.avg_ms ?? 0,
      count: Number(r.count),
    });
  }

  for (let i = 0; i < bucketCount; i++) {
    const bucketTime = new Date(now.getTime() - (bucketCount - 1 - i) * 60 * 60 * 1000);
    bucketTime.setMinutes(0, 0, 0);
    const entry = bucketByKey.get(bucketTime.getTime());
    if (entry && entry.count > 0) {
      buckets[i].avgMs = Math.round(entry.avgMs);
      buckets[i].checks = entry.count;
    }
  }

  return buckets;
}

/** Recent checks for a monitor, oldest first, for a sparkline. */
export async function recentChecksForSparkline(monitorId: string, take = 20) {
  const rows = await prisma.check.findMany({
    where: { monitorId },
    orderBy: { checkedAt: "desc" },
    take,
    select: { checkedAt: true, responseTimeMs: true, status: true },
  });
  return rows.reverse().map((r) => ({
    t: r.checkedAt.getTime(),
    v: r.status === "UP" ? r.responseTimeMs : null,
  }));
}

/**
 * Daily uptime status for the last 30 days (oldest first).
 * Aggregates in Postgres to avoid loading all checks into memory.
 */
export async function dailyUptimeForMonitor(
  monitorId: string,
  days = 30
): Promise<{ date: string; up: boolean | null }[]> {
  const result: { date: string; up: boolean | null }[] = [];
  const now = new Date();

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

  const rows = await prisma.$queryRaw<
    { day: Date; up_count: bigint; down_count: bigint }[]
  >`
    SELECT
      date_trunc('day', "checkedAt") as day,
      SUM(CASE WHEN "status" = 'UP' THEN 1 ELSE 0 END)::bigint as up_count,
      SUM(CASE WHEN "status" = 'DOWN' THEN 1 ELSE 0 END)::bigint as down_count
    FROM "Check"
    WHERE "monitorId" = ${monitorId}
      AND "checkedAt" >= ${since}
    GROUP BY day
  `;

  const dayMap = new Map<string, { up: number; down: number }>();
  for (const r of rows) {
    const key = r.day.toISOString().split("T")[0];
    dayMap.set(key, {
      up: Number(r.up_count),
      down: Number(r.down_count),
    });
  }

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split("T")[0];
    const entry = dayMap.get(key);
    if (entry) {
      result[i].up = entry.down === 0 ? true : entry.up > entry.down;
    }
  }

  return result;
}

/**
 * Sparkline data for multiple monitors in a single query.
 */
export async function recentChecksForSparklines(
  monitorIds: string[],
  take = 30
): Promise<Map<string, { t: number; v: number | null }[]>> {
  if (monitorIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<
    { monitorId: string; checkedAt: Date; responseTimeMs: number | null; status: string }[]
  >`
    SELECT "monitorId", "checkedAt", "responseTimeMs", "status"::text as status
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY "monitorId"
          ORDER BY "checkedAt" DESC
        ) as rn
      FROM "Check"
      WHERE "monitorId" = ANY(${monitorIds}::text[])
    ) sub
    WHERE rn <= ${take}
    ORDER BY "monitorId", "checkedAt" ASC
  `;

  const result = new Map<string, { t: number; v: number | null }[]>();

  for (const monitorId of monitorIds) {
    result.set(monitorId, []);
  }

  for (const row of rows) {
    const entry = result.get(row.monitorId);
    if (entry) {
      entry.push({
        t: row.checkedAt.getTime(),
        v: row.status === "UP" ? row.responseTimeMs : null,
      });
    }
  }

  return result;
}

/**
 * Top N monitors with best average performance over the selected time period.
 * Calculates period averages instead of using denormalized values.
 */
export async function topPerformingUrls(
  userId: string,
  take = 5,
  hours = 24
): Promise<{
  id: string;
  name: string;
  target: string;
  lastResponseTimeMs: number;
  uptimePct: number;
  spark: number[];
}[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Calculate average response time and uptime percentage for the period
  const rows = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      target: string;
      avgResponseTime: number;
      uptimePct: number;
      checkCount: number;
    }[]
  >`
    SELECT
      m."id",
      m."name",
      m."target",
      AVG(c."responseTimeMs")::float as "avgResponseTime",
      (COUNT(CASE WHEN c."status" = 'UP' THEN 1 END)::float / COUNT(*)::float * 100)::float as "uptimePct",
      COUNT(*)::int as "checkCount"
    FROM "Monitor" m
    JOIN "Check" c ON m."id" = c."monitorId"
    WHERE m."userId" = ${userId}
      AND m."isPaused" = false
      AND c."checkedAt" >= ${since}
    GROUP BY m."id", m."name", m."target"
    HAVING COUNT(*) > 0
    ORDER BY AVG(c."responseTimeMs") ASC
    LIMIT ${take}
  `;

  if (rows.length === 0) return [];

  // Fetch sparklines for these monitors
  const ids = rows.map((r) => r.id);
  const sparkRows = await prisma.$queryRaw<
    { monitorId: string; responseTimeMs: number; checkedAt: Date }[]
  >`
    SELECT "monitorId", "responseTimeMs", "checkedAt"
    FROM (
      SELECT
        "monitorId",
        "responseTimeMs",
        "checkedAt",
        ROW_NUMBER() OVER (
          PARTITION BY "monitorId"
          ORDER BY "checkedAt" DESC
        ) as rn
      FROM "Check"
      WHERE "monitorId" = ANY(${ids}::text[])
        AND "status" = 'UP'
        AND "responseTimeMs" IS NOT NULL
    ) sub
    WHERE rn <= 10
    ORDER BY "monitorId", "checkedAt" ASC
  `;

  const sparkMap = new Map<string, number[]>();
  for (const id of ids) sparkMap.set(id, []);
  for (const r of sparkRows) {
    sparkMap.get(r.monitorId)?.push(r.responseTimeMs);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    target: r.target,
    lastResponseTimeMs: Math.round(r.avgResponseTime),
    uptimePct: Math.round(r.uptimePct * 10) / 10,
    spark: sparkMap.get(r.id) ?? [],
  }));
}