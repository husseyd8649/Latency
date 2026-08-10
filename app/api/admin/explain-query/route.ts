import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get 10 real monitor IDs to test with
    const monitors = await prisma.monitor.findMany({
      take: 10,
      select: { id: true },
    });
    const ids = monitors.map((m) => m.id);

    // Check what indexes exist on Check
    const indexes = await prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Check'
    `;

    // Run EXPLAIN ANALYZE on the actual query
    const explain = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN ANALYZE
      SELECT DISTINCT ON ("monitorId")
        "monitorId",
        "status"::text as status,
        "responseTimeMs",
        "checkedAt",
        "error"
      FROM "Check"
      WHERE "monitorId" = ANY(${ids}::text[])
      ORDER BY "monitorId", "checkedAt" DESC
    `;

    // Get table stats
    const stats = await prisma.$queryRaw<{ n_live_tup: bigint; last_vacuum: Date | null; last_autovacuum: Date | null }[]>`
      SELECT n_live_tup, last_vacuum, last_autovacuum
      FROM pg_stat_user_tables
      WHERE relname = 'Check'
    `;

    return NextResponse.json({
      ok: true,
      rowCount: stats[0] ? Number(stats[0].n_live_tup) : null,
      lastVacuum: stats[0]?.last_vacuum,
      lastAutovacuum: stats[0]?.last_autovacuum,
      indexes,
      queryPlan: explain.map((e) => e["QUERY PLAN"]),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}