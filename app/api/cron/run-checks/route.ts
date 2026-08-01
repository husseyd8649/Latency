// app/api/cron/run-checks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMonitorCheck, runWithConcurrency } from "@/lib/checkers/runner";

// TCP/TLS require Node runtime, not Edge
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONCURRENCY = 10;

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

  return NextResponse.json({
    ok: true,
    checked: due.length,
    durationMs,
  });
}

// Handy for cron services that only support GET
export async function GET(req: Request) {
  return POST(req);
}
