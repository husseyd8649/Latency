import {
  Card,
  CardBody,
  CardHeader,
  Badge,
  PageHeader,
  Button,
} from "@/components/ui/primitives";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  avgLatency,
  hourlyLatency,
  uptimeForMonitors,
  topPerformingUrls,
} from "@/lib/stats";
import { UptimeChart } from "@/components/uptime-chart";
import { SystemHealthGauge } from "@/components/system-health-gauge";
import { DashboardGaugeCard } from "@/components/dashboard-gauge-card";
import { TopUrlsCard } from "@/components/top-urls-card";
import { RegionalHealth } from "@/components/regional-health";

export default async function OverviewPage() {
  const user = await requireUser();

  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      isPaused: true,
      regionId: true,
      lastStatus: true,
    },
  });
  const monitorIds = monitors.map((m) => m.id);

  const [
    activeIncidentCount,
    uptime,
    avgMs,
    hourly,
    recentIncidents,
    regions,
    incidentCounts,
    topUrls,
  ] = await Promise.all([
    prisma.incident.count({
      where: { resolvedAt: null, monitor: { userId: user.id } },
    }),
    uptimeForMonitors(monitorIds, 24),
    avgLatency(monitorIds, 24),
    hourlyLatency(monitorIds),
    prisma.incident.findMany({
      where: { monitor: { userId: user.id } },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { monitor: { select: { name: true, type: true } } },
    }),
    prisma.region.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, color: true },
    }),
    monitorIds.length > 0
      ? prisma.incident.groupBy({
          by: ["monitorId"],
          where: {
            resolvedAt: null,
            monitorId: { in: monitorIds },
          },
          _count: { _all: true },
        })
      : [],
    topPerformingUrls(user.id, 5, 24),
  ]);

  const incidentsByMonitor = new Map(
    incidentCounts.map((ic) => [ic.monitorId, ic._count._all])
  );

  // -- Regional health data --
  type RegionBucket = {
    id: string | null;
    name: string;
    slug: string;
    color: string;
    total: number;
    up: number;
    down: number;
    paused: number;
    activeIncidents: number;
  };

  const regionMap = new Map<string, RegionBucket>();
  for (const r of regions) {
    regionMap.set(r.id, {
      id: r.id, name: r.name, slug: r.slug, color: r.color,
      total: 0, up: 0, down: 0, paused: 0, activeIncidents: 0,
    });
  }
  const ungroupedKey = "__ungrouped__";
  regionMap.set(ungroupedKey, {
    id: null, name: "Ungrouped", slug: "ungrouped", color: "var(--text-subtle)",
    total: 0, up: 0, down: 0, paused: 0, activeIncidents: 0,
  });

  for (const m of monitors) {
    const bucketKey = m.regionId ?? ungroupedKey;
    const bucket = regionMap.get(bucketKey);
    if (!bucket) continue;
    bucket.total += 1;
    if (m.isPaused) {
      bucket.paused += 1;
    } else {
      if (m.lastStatus === "UP") bucket.up += 1;
      else if (m.lastStatus === "DOWN") bucket.down += 1;
    }
    bucket.activeIncidents += incidentsByMonitor.get(m.id) ?? 0;
  }

  const regionalData = Array.from(regionMap.values()).filter(
    (r) => r.id !== null || r.total > 0
  );

  // -- Latency gauge config --
  const latencyMax = 2000; // 2s ceiling for the gauge scale
  const latencyPct = avgMs != null ? Math.min(latencyMax, avgMs) : 0;

  // -- Monitors gauge config --
  const monitorsMax = Math.max(500, monitors.length);

  return (
    <>
      <PageHeader
        title="Overview"
        description="A summary of your monitoring workspace."
        actions={
          <Link href="/dashboard/add">
            <Button size="sm">
              <ArrowUpRight className="w-3.5 h-3.5" />
              New monitor
            </Button>
          </Link>
        }
      />

      {/* Top row: three gauges — latency (left), health (center), monitors (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 mb-6 items-stretch">
        <DashboardGaugeCard
          label="Avg. Response Time"
          value={latencyPct}
          maxValue={latencyMax}
          displayValue={avgMs != null ? `${avgMs}ms` : "—"}
          color="#10B981"
          subtitle="24h average"
        />
        <SystemHealthGauge
          uptimePct={uptime.uptimePct}
          activeIncidents={activeIncidentCount}
          avgLatencyMs={avgMs}
        />
        <DashboardGaugeCard
          label="Total Monitors"
          value={monitors.length}
          maxValue={monitorsMax}
          displayValue={
            monitors.length >= 1000
              ? `${(monitors.length / 1000).toFixed(1)}K`
              : String(monitors.length)
          }
          color="#2563EB"
          subtitle={`${activeIncidentCount} active incident${activeIncidentCount !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Bottom row: latency chart + top URLs card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">
                  Response time (24h)
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  Average latency across your monitors (UP checks only).
                </div>
              </div>
              <Badge variant="accent">Live</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <UptimeChart data={hourly} />
          </CardBody>
        </Card>

        <TopUrlsCard urls={topUrls} />
      </div>

      {/* Regional Health */}
      {regionalData.length > 0 && (
        <div className="mb-6">
          <RegionalHealth regions={regionalData} />
        </div>
      )}

      {/* Recent incidents */}
      <Card className="animate-fade-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[var(--text)]">Recent incidents</div>
            <Link
              href="/dashboard/incidents"
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {recentIncidents.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] text-center py-8">
              No incidents recorded. All quiet.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentIncidents.map((inc) => {
                const resolved = !!inc.resolvedAt;
                const durMs =
                  (inc.resolvedAt ?? new Date()).getTime() -
                  inc.startedAt.getTime();
                return (
                  <li key={inc.id} className="py-3 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        resolved
                          ? "bg-[var(--up-soft)] text-[var(--op-up)]"
                          : "bg-[var(--down-soft)] text-[var(--op-down)]"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text)] truncate">
                        {inc.monitor.name}{" "}
                        <span className="text-[10px] font-mono text-[var(--text-subtle)] ml-1">
                          {inc.monitor.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {inc.cause ?? "Check failed"}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={resolved ? "up" : "down"}>
                        {resolved ? "Resolved" : "Ongoing"}
                      </Badge>
                      <div className="text-[10px] text-[var(--text-subtle)] mt-1 font-mono">
                        {formatDuration(durMs)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}