import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Simple device detection without external dependency
function getDeviceType(userAgent: string): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") && !ua.includes("ipad")) return "mobile";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  if (ua.includes("bot") || ua.includes("crawl")) return "bot";
  return "desktop";
}

export async function trackSession(userId: string) {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || 
             headersList.get("x-real-ip") || 
             "unknown";

  const deviceType = getDeviceType(userAgent);
  
  // Optional: Get location from IP (skip for localhost)
  let location = "Unknown";
  try {
    if (!ip.includes("127.0.0.1") && !ip.includes("::1") && ip !== "unknown") {
      const geo = await fetch(`https://ipapi.co/${ip}/json/`, { 
        next: { revalidate: 3600 }
      }).then(r => r.json());
      location = geo.city && geo.country_name 
        ? `${geo.city}, ${geo.country_name}` 
        : "Unknown";
    }
  } catch {
    location = "Unknown";
  }

  // Update existing active session or create new (30 min window)
  const existing = await prisma.loginHistory.findFirst({
    where: {
      userId,
      lastActiveAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }
    }
  });

  if (existing) {
    await prisma.loginHistory.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date() }
    });
  } else {
    await prisma.loginHistory.create({
      data: {
        userId,
        userAgent: userAgent.slice(0, 500),
        ipAddress: ip,
        location,
        deviceType,
      }
    });
  }
}