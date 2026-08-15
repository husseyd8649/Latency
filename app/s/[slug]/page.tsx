// app/s/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusPageView } from "@/components/status-page-view";

export const revalidate = 0; // Dynamic data

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.statusPage.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });
  
  return {
    title: page?.title || "Status Page",
    description: page?.description || "Service status and uptime information",
  };
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const statusPage = await prisma.statusPage.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          monitors: {
            where: { isPaused: false },
            select: {
              id: true,
              name: true,
              type: true,
              target: true,
              lastStatus: true,
              lastResponseTimeMs: true,
              lastCheckedAt: true,
            },
          },
        },
      },
    },
  });

  if (!statusPage) {
    notFound();
  }

  // Get monitors in this status page
  const monitors = statusPage.user.monitors.filter(m => 
    statusPage.monitorIds.includes(m.id)
  );

  // Calculate overall status
  const downCount = monitors.filter(m => m.lastStatus === "DOWN").length;
  const upCount = monitors.filter(m => m.lastStatus === "UP").length;
  
  let overallStatus: "operational" | "degraded" | "major-outage" = "operational";
  if (downCount === monitors.length && monitors.length > 0) {
    overallStatus = "major-outage";
  } else if (downCount > 0) {
    overallStatus = "degraded";
  }

  // Get recent incidents for these monitors
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const incidents = await prisma.incident.findMany({
    where: {
      monitorId: { in: statusPage.monitorIds },
      startedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { startedAt: "desc" },
    include: {
      monitor: {
        select: { name: true, type: true },
      },
    },
    take: 50,
  });

  // Calculate uptime for last 30 days
  const checks = await prisma.check.findMany({
    where: {
      monitorId: { in: statusPage.monitorIds },
      checkedAt: { gte: thirtyDaysAgo },
    },
    select: { status: true },
  });
  
  const uptime30d = checks.length > 0
    ? (checks.filter(c => c.status === "UP").length / checks.length * 100).toFixed(2)
    : "100.00";

  return (
    <StatusPageView
      title={statusPage.title}
      description={statusPage.description}
      slug={slug}
      monitors={monitors}
      incidents={incidents}
      overallStatus={overallStatus}
      uptime30d={uptime30d}
      totalMonitors={monitors.length}
      downCount={downCount}
    />
  );
}