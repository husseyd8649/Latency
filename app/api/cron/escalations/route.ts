import { NextResponse } from "next/server";
import { processEscalations } from "@/lib/escalation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth check (same CRON_SECRET as your main cron)
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

  try {
    const result = await processEscalations();
    
    console.log(`Escalation cron completed: ${result.sent} sent, ${result.failed} failed, ${result.processed} incidents checked`);
    
    return NextResponse.json({
      ok: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Escalation cron failed:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

// Optional: Add GET for manual testing (cron-job.org uses POST, but GET is handy for browser checks)
export async function GET(req: Request) {
  return POST(req);
}