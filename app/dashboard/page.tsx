import {
  Card,
  CardBody,
  CardHeader,
  Badge,
  StatusDot,
  PageHeader,
  Button,
} from "@/components/ui/primitives";
import {
  Activity,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Zap,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { avgLatency, hourlyLatency, uptimeForMonitors } from "@/lib/stats";
import { UptimeChart } from "@/components/uptime-chart";
import { SystemHealthDonut } from "@/components/system-health-donut";
import { MiniDonut } from "@/components/mini-donut";
import { RegionalHealth } from "@/components/regional-health";

type LatestCheckRow = {
  monitorId: string;
  status: string;
};

export default async function OverviewPage() {
  const user = await requireUser();

  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, isPaused: true, regionId: true },
  });
  const monitorIds = monitors.map((m) => m.id);

  const [
    activeIncidentCount,
    uptime,
    avgMs,
    hourly,
    recentIncidents,
    regions,
    latestChecks,
    incidentCounts,
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
      ? prisma.$queryRaw<LatestCheckRow[]>`
          SELECT DISTINCT ON ("monitorId")
            "monitorId",
            "status"::text as status
          FROM "Check"
          WHERE "monitorId" = ANY(${monitorIds}::text[])
          ORDER BY "monitorId", "checkedAt" DESC
        `
      : ([] as LatestCheckRow[]),
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
  ]);

  const statusByMonitor = new Map(
    latestChecks.map((c) => [c.monitorId, c.status])
  );

  const incidentsByMonitor = new Map(
    incidentCounts.map((ic) => [ic.monitorId, ic._count._all])
  );

  // -- Build regional health data --
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

  // Init buckets for each user region
  for (const r of regions) {
    regionMap.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      color: r.color,
      total: 0,
      up: 0,
      down: 0,
      paused: 0,
      activeIncidents: 0,
    });
  }

  // Init ungrouped bucket
  const ungroupedKey = "__ungrouped__";
  regionMap.set(ungroupedKey, {
    id: null,
    name: "Ungrouped",
    slug: "ungrouped",
    color: "var(--text-subtle)",
    total: 0,
    up: 0,
    down: 0,
    paused: 0,
    activeIncidents: 0,
  });

  // Populate buckets
  for (const m of monitors) {
    const bucketKey = m.regionId ?? ungroupedKey;
    const bucket = regionMap.get(bucketKey);
    if (!bucket) continue;

    bucket.total += 1;

    if (m.isPaused) {
      bucket.paused += 1;
    } else {
      const status = statusByMonitor.get(m.id);
      if (status === "UP") bucket.up += 1;
      else if (status === "DOWN") bucket.down += 1;
    }

    bucket.activeIncidents += incidentsByMonitor.get(m.id) ?? 0;
  }

  // Convert to array, filter out empty ungrouped
  const regionalData = Array.from(regionMap.values()).filter(
    (r) => r.id !== null || r.total > 0
  );

  // -- Stat cards --
  const uptimeColor =
    uptime.uptimePct == null
      ? "var(--text-subtle)"
      : uptime.uptimePct >= 99
      ? "var(--op-up)"
      : uptime.uptimePct >= 95
      ? "var(--op-degraded)"
      : "var(--op-down)";

  const stats = [
    {
      label: "Uptime (24h)",
      value:
        uptime.uptimePct == null
          ? "—"
          : `${uptime.uptimePct.toFixed(2)}%`,
      delta:
        uptime.totalChecks === 0
          ? "No data yet"
          : `${uptime.upChecks}/${uptime.totalChecks} checks`,
      icon: TrendingUp,
      miniDonut:
        uptime.uptimePct != null
          ? { value: uptime.uptimePct, color: uptimeColor }
          : null,
    },
    {
      label: "Monitors",
      value: String(monitors.length),
      delta: monitors.length === 0 ? "Add your first" : "Active",
      icon: Activity,
      miniDonut: null,
    },
    {
      label: "Active incidents",
      value: String(activeIncidentCount),
      delta: activeIncidentCount === 0 ? "All clear" : "Attention required",
      icon: Zap,
      miniDonut: null,
    },
    {
      label: "Avg. latency (24h)",
      value: avgMs == null ? "—" : `${avgMs}ms`,
      delta: avgMs == null ? "No data yet" : "UP checks only",
      icon: Clock,
      miniDonut: null,
    },
  ];

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

      {/* System Health Hero */}
      <div className="mb-6">
        <SystemHealthDonut
          uptimePct={uptime.uptimePct}
          activeIncidents={activeIncidentCount}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="animate-fade-up hover:border-[var(--border-strong)] transition-colors"
              style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
            >
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                    {s.label}
                  </div>
                  <Icon className="w-4 h-4 text-[var(--text-subtle)]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-2xl font-semibold text-[var(--text)]">
                    {s.value}
                  </div>
                  {s.miniDonut && (
                    <MiniDonut
                      value={s.miniDonut.value}
                      color={s.miniDonut.color}
                    />
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{s.delta}</div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Regional Health */}
      {regionalData.length > 0 && (
        <div className="mb-6">
          <RegionalHealth regions={regionalData} />
        </div>
      )}

      {/* Latency chart */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "240ms" } as React.CSSProperties}>
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

      {/* Recent incidents */}
      <Card className="animate-fade-up" style={{ animationDelay: "300ms" } as React.CSSProperties}>
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