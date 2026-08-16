import { NextResponse } from "next/server";
import { processEscalations } from "@/lib/escalation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth check
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[Cron] CRON_SECRET not configured");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    console.error("[Cron] Unauthorized escalation attempt");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  console.log("[Cron] Starting escalation processing...");
  const startTime = Date.now();

  try {
    const result = await processEscalations();
    const duration = Date.now() - startTime;
    
    console.log(`[Cron] Escalation completed in ${duration}ms:`, {
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      skippedPaused: result.skippedPaused,
      skippedMaintenance: result.skippedMaintenance
    });
    
    return NextResponse.json({
      ok: true,
      result,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Escalation processing failed:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing via browser/curl
export async function GET(req: Request) {
  return POST(req);
}