import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  avgLatency,
  hourlyLatency,
  uptimeForMonitors,
  topPerformingUrls,
} from "@/lib/stats";
import { DashboardContent } from "@/components/dashboard-content";
import { DashboardGaugeCard } from "@/components/dashboard-gauge-card";
import { SystemHealthGauge } from "@/components/system-health-gauge";
import { UptimeChart } from "@/components/uptime-chart";
import { TopUrlsCard } from "@/components/top-urls-card";
import { RegionalHealth } from "@/components/regional-health";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui/primitives";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { RunFailedButton } from "@/components/run-failed-button";
import { ReconcileIconButton } from "@/components/reconcile-icon-button";

type TimeRange = "1h" | "4h" | "24h" | "7d" | "30d";

const TIME_RANGES: { value: TimeRange; label: string; hours: number }[] = [
  { value: "1h", label: "1 Hour", hours: 1 },
  { value: "4h", label: "4 Hours", hours: 4 },
  { value: "24h", label: "24 Hours", hours: 24 },
  { value: "7d", label: "7 Days", hours: 168 },
  { value: "30d", label: "30 Days", hours: 720 },
];

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; loadingMode?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  
  const timeRange = (params.range as TimeRange) || "24h";
  const hours = TIME_RANGES.find(r => r.value === timeRange)?.hours || 24;

  // Fetch data (same as before)
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
    uptimeForMonitors(monitorIds, hours),
    avgLatency(monitorIds, hours),
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
          where: { resolvedAt: null, monitorId: { in: monitorIds } },
          _count: { _all: true },
        })
      : [],
    topPerformingUrls(user.id, 5, hours),
  ]);

  // Calculate counts
  const upCount = monitors.filter(m => !m.isPaused && m.lastStatus === "UP").length;
  const downCount = monitors.filter(m => !m.isPaused && m.lastStatus === "DOWN").length;
  const pausedCount = monitors.filter(m => m.isPaused).length;

  const latencyMax = 2000;
  const latencyPct = avgMs != null ? Math.min(latencyMax, avgMs) : 0;

  // Regional data
  const incidentsByMonitor = new Map(
    incidentCounts.map((ic) => [ic.monitorId, ic._count._all])
  );

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

  return (
    <DashboardContent initialRange={timeRange} hours={hours}>
      <div className="space-y-6">
        {/* Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 items-stretch">
          <DashboardGaugeCard
            label="Avg. Response Time"
            value={latencyPct}
            maxValue={latencyMax}
            maxLabel="2s"
            displayValue={avgMs != null ? `${avgMs}ms` : "—"}
            color="#10B981"
            subtitle={`Past ${hours}h average`}
          />
          <SystemHealthGauge
            uptimePct={uptime.uptimePct}
            activeIncidents={activeIncidentCount}
            avgLatencyMs={avgMs}
            upCount={upCount}
            downCount={downCount}
            pausedCount={pausedCount}
          />
          <DashboardGaugeCard
            label="Total Monitors"
            value={monitors.length}
            displayValue={String(monitors.length)}
            maxValue={Math.max(1000, monitors.length)}
            maxLabel="1000"
            color="#2563EB"
            subtitle={`${activeIncidentCount} active incident${activeIncidentCount !== 1 ? "s" : ""}`}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="animate-fade-up lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--text)]">
                    Response time ({hours}h)
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

          <TopUrlsCard urls={topUrls} hours={hours} />
        </div>

        {/* Regional Health */}
        {regionalData.length > 0 && (
          <div>
            <RegionalHealth regions={regionalData} />
          </div>
        )}

        {/* Incidents */}
        <Card className="animate-fade-up overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[var(--down-soft)] text-[var(--op-down)] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text)] leading-tight">
                  Recent Incidents
                </div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                  Latest downtime events
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <RunFailedButton />
              <ReconcileIconButton />
              <Link
                href="/dashboard/incidents"
                className="text-[10px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors inline-flex items-center gap-1"
              >
                View all →
              </Link>
            </div>
          </div>

          <CardBody className="p-0">
            {recentIncidents.length === 0 ? (
              <div className="text-center py-10 px-5">
                <div className="w-10 h-10 rounded-full bg-[var(--up-soft)] border border-[var(--op-up)]/25 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--op-up)]" />
                </div>
                <div className="text-xs font-medium text-[var(--text)] mb-0.5">
                  All clear
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  No incidents recorded. All quiet.
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {recentIncidents.map((inc) => {
                  const resolved = !!inc.resolvedAt;
                  const durMs =
                    (inc.resolvedAt ?? new Date()).getTime() -
                    inc.startedAt.getTime();

                  return (
                    <li
                      key={inc.id}
                      className="px-5 py-3 hover:bg-[var(--surface-2)]/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] ${
                            resolved
                              ? "bg-[var(--up-soft)] text-[var(--op-up)] border-[var(--op-up)]/30"
                              : "bg-[var(--down-soft)] text-[var(--op-down)] border-[var(--op-down)]/30"
                          }`}
                        >
                          {resolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-[var(--text)] truncate">
                              {inc.monitor.name}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-subtle)] uppercase tracking-wider shrink-0">
                              {inc.monitor.type}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {inc.cause ?? "Check failed"}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <Badge variant={resolved ? "up" : "down"}>
                            {resolved ? "Resolved" : "Ongoing"}
                          </Badge>
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-subtle)]">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {formatDuration(durMs)}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardContent>
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