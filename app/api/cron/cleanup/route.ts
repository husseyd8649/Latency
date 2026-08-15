import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CLEANUP_BATCH_SIZE = 5000;
const RETENTION_DAYS = 30;
const INCIDENT_RETENTION_DAYS = 90;

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

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - INCIDENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    // 1. Cleanup old checks
    const checkResult = await prisma.$executeRaw`
      DELETE FROM "Check"
      WHERE "id" IN (
        SELECT "id" FROM "Check"
        WHERE "checkedAt" < ${cutoff}
        LIMIT ${CLEANUP_BATCH_SIZE}
      )
    `;

    // 2. Cleanup old resolved incidents
    const incidentResult = await prisma.incident.deleteMany({
      where: {
        resolvedAt: { not: null },
        startedAt: { lt: ninetyDaysAgo }
      }
    });

    // 3. Check database size (for monitoring)
    const dbSize = await prisma.$queryRaw<{ size: string }[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;

    return NextResponse.json({
      ok: true,
      deleted: {
        checks: Number(checkResult),
        incidents: incidentResult.count,
      },
      databaseSize: dbSize[0]?.size,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { ok: false, error: "Cleanup failed", details: String(error) },
      { status: 500 }
    );
  }
}