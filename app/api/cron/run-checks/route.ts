import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMonitorCheck, runWithConcurrency } from "@/lib/checkers/runner";

// TCP/TLS require Node runtime, not Edge
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONCURRENCY = 10;
const CLEANUP_BATCH_SIZE = 5000;
const RETENTION_DAYS = 30; // Retain 30 days for dashboard time range views

export async function POST(req: Request) {
  // Auth: expect "Authorization: Bearer <CRON_SECRET>"
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (authHeader !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.monitor.findMany({
    where: {
      isPaused: false,
      OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }],
    },
    orderBy: { nextCheckAt: "asc" },
    take: 500,
  });

  const startedAt = Date.now();
  await runWithConcurrency(due, CONCURRENCY, (m) => runMonitorCheck(m));
  const durationMs = Date.now() - startedAt;

  // -- Cleanup: delete old checks in bounded batches --
  const cleanupStartedAt = Date.now();
  let cleanupDeleted = 0;
  let incidentsDeleted = 0;
  
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // 1. Cleanup old checks (bounded batch)
    const result = await prisma.$executeRaw`
      DELETE FROM "Check"
      WHERE "id" IN (
        SELECT "id" FROM "Check"
        WHERE "checkedAt" < ${cutoff}
        LIMIT ${CLEANUP_BATCH_SIZE}
      )
    `;
    cleanupDeleted = Number(result);

    // 2. Cleanup old resolved incidents (90 days - separate from checks)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const incidentResult = await prisma.incident.deleteMany({
      where: {
        resolvedAt: { not: null },
        startedAt: { lt: ninetyDaysAgo }
      }
    });
    incidentsDeleted = incidentResult.count;

    // 3. Monitor database size (optional safety check)
    try {
      const dbSize = await prisma.$queryRaw<{ size: string }[]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      console.log(`Database size: ${dbSize[0].size}`);
    } catch (e) {
      // Ignore monitoring errors
    }
    
  } catch (e) {
    console.error("Cleanup failed:", e);
  }
  
  const cleanupDurationMs = Date.now() - cleanupStartedAt;

  return NextResponse.json({
    ok: true,
    checked: due.length,
    durationMs,
    cleanup: {
      deleted: cleanupDeleted,
      incidentsDeleted: incidentsDeleted,
      durationMs: cleanupDurationMs,
    },
  });
}

export async function GET(req: Request) {
  return POST(req);
}