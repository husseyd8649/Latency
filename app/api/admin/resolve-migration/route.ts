import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY endpoint to mark a failed migration as rolled back.
 * DELETE THIS FILE after use.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const migrationName = "20260810130000_prune_old_checks";

  try {
    // Mark the failed migration as rolled back by updating the Prisma migrations table directly
    const result = await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET "rolled_back_at" = NOW()
      WHERE "migration_name" = ${migrationName}
        AND "finished_at" IS NULL
        AND "rolled_back_at" IS NULL
    `;

    return NextResponse.json({
      ok: true,
      rowsUpdated: Number(result),
      message: `Marked ${migrationName} as rolled back. It will be retried on next deploy.`,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// Support GET for easy triggering
export async function GET(req: Request) {
  return POST(req);
}