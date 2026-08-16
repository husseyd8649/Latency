import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const key = authHeader.replace("Bearer ", "").trim();
  
  if (!key) {
    return NextResponse.json(
      { error: "Missing API key", code: "UNAUTHORIZED" }, 
      { status: 401 }
    );
  }

  const userId = await validateApiKey(key);
  
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or expired API key", code: "UNAUTHORIZED" }, 
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "up", "down", or null for all
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);

  const monitors = await prisma.monitor.findMany({
    where: {
      userId,
      ...(status === "up" ? { lastStatus: "UP" } : {}),
      ...(status === "down" ? { lastStatus: "DOWN" } : {}),
    },
    take: limit,
    orderBy: { lastCheckedAt: "desc" },
    select: {
      id: true,
      name: true,
      target: true,
      type: true,
      lastStatus: true,
      lastResponseTimeMs: true,
      lastCheckedAt: true,
      isPaused: true,
      intervalSeconds: true,
      regionId: true,
    },
  });

  return NextResponse.json({
    data: monitors,
    meta: {
      total: monitors.length,
      timestamp: new Date().toISOString(),
    },
  });
}