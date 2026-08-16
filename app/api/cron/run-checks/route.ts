import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWithConcurrency, runMonitorCheck } from "@/lib/checkers/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONCURRENCY = 15;
const MAX_MONITORS_PER_RUN = 200; // Conservative for Render free tier 30s limit
const MAX_EXECUTION_MS = 25000; // Hard stop at 25s (Render limit ~30s)

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const now = new Date();

  // Fetch all due monitors, oldest first (fairness)
  const dueMonitors = await prisma.monitor.findMany({
    where: {
      isPaused: false,
      OR: [
        { nextCheckAt: null },
        { nextCheckAt: { lte: now } }
      ],
    },
    orderBy: {
      nextCheckAt: "asc",
    },
  });

  // Safety cap: If too many are due (recovery from downtime), process only first batch
  // They will be processed in subsequent cron runs (next minute)
  const toProcess = dueMonitors.slice(0, MAX_MONITORS_PER_RUN);
  const skipped = dueMonitors.length - toProcess.length;

  let processedCount = 0;
  let errorCount = 0;
  let timeLimitReached = false;

  // Process with concurrency, but check time limit periodically
  await runWithConcurrency(
    toProcess,
    CONCURRENCY,
    async (monitor) => {
      // Check time limit before starting this check
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        timeLimitReached = true;
        return;
      }

      try {
        await runMonitorCheck(monitor);
        processedCount++;
      } catch (err) {
        errorCount++;
        console.error(`Check failed for monitor ${monitor.id}:`, err);
      }
    }
  );

  const durationMs = Date.now() - startTime;

  return NextResponse.json({
    ok: true,
    summary: {
      totalDue: dueMonitors.length,
      processed: processedCount,
      skipped: skipped,
      errors: errorCount,
      timeLimitReached,
      durationMs,
    },
    warning: skipped > 0 || timeLimitReached 
      ? "High load detected. Remaining monitors will process in subsequent runs."
      : undefined,
  });
}

export async function GET(req: Request) {
  return POST(req);
}