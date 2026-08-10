import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Card,
  CardBody,
  PageHeader,
} from "@/components/ui/primitives";
import { AlertTriangle, CheckCircle2, Globe, Network, ShieldCheck } from "lucide-react";
import { ReconcileIncidentsButton } from "@/components/reconcile-incidents-button";
import { RegionFilterBar } from "@/components/region-filter-bar";

const typeIconMap = {
  HTTP: Globe,
  TCP: Network,
  SSL: ShieldCheck,
} as const;

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const regionParam = params.region?.trim() || null;

  // Fetch regions for filter resolution
  const regions = await prisma.region.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, color: true },
  });

  // Resolve region filter
  let activeFilter: {
    regionId: string | null;
    isUngrouped: boolean;
    name: string;
    color: string;
  } | null = null;

  if (regionParam === "ungrouped") {
    activeFilter = {
      regionId: null,
      isUngrouped: true,
      name: "Ungrouped",
      color: "var(--text-subtle)",
    };
  } else if (regionParam) {
    const matched = regions.find(
      (r) => r.slug.toLowerCase() === regionParam.toLowerCase()
    );
    if (matched) {
      activeFilter = {
        regionId: matched.id,
        isUngrouped: false,
        name: matched.name,
        color: matched.color,
      };
    }
  }

  // Build the monitor filter for the incident query
  const monitorFilter: {
    userId: string;
    regionId?: string | null;
  } = { userId: user.id };

  if (activeFilter) {
    monitorFilter.regionId = activeFilter.isUngrouped
      ? null
      : activeFilter.regionId;
  }

  // Fetch filtered incidents AND total incident count in parallel
  const [incidents, totalCount] = await Promise.all([
    prisma.incident.findMany({
      where: { monitor: monitorFilter },
      orderBy: [
        { resolvedAt: { sort: "asc", nulls: "first" } },
        { startedAt: "desc" },
      ],
      take: 100,
      include: {
        monitor: {
          select: { id: true, name: true, type: true, target: true },
        },
      },
    }),
    prisma.incident.count({
      where: { monitor: { userId: user.id } },
    }),
  ]);

  const active = incidents.filter((i) => !i.resolvedAt);
  const resolved = incidents.filter((i) => i.resolvedAt);

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Downtime timeline across your monitors."
        actions={<ReconcileIncidentsButton />}
      />

            {activeFilter && (
        <RegionFilterBar
          region={{ name: activeFilter.name, color: activeFilter.color }}
          matchedCount={incidents.length}
          totalCount={totalCount}
          itemLabel="incident"
          clearHref="/dashboard/incidents"
        />
      )}

      {incidents.length === 0 ? (
        <Card className="animate-fade-up">
          <CardBody className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--up-soft)] border border-[var(--op-up)]/25 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-5 h-5 text-[var(--op-up)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text)]">
              {activeFilter
                ? `No incidents in ${activeFilter.name}`
                : "No incidents recorded"}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {activeFilter
                ? "This region has no incidents recorded."
                : "When a monitor goes down, it will appear here."}
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <SectionTitle label="Active" count={active.length} tone="down" />
              <IncidentList incidents={active} />
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <SectionTitle label="Resolved" count={resolved.length} tone="up" />
              <IncidentList incidents={resolved} />
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */

type IncidentRow = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  cause: string | null;
  monitor: {
    id: string;
    name: string;
    type: "HTTP" | "TCP" | "SSL";
    target: string;
  };
};

function SectionTitle({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "up" | "down";
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <Badge variant={tone}>{count}</Badge>
    </div>
  );
}

function IncidentList({ incidents }: { incidents: IncidentRow[] }) {
  return (
    <Card className="animate-fade-up overflow-hidden">
      <ul className="divide-y divide-[var(--border)]">
        {incidents.map((inc) => {
          const resolved = !!inc.resolvedAt;
          const TypeIcon = typeIconMap[inc.monitor.type];
          const durMs =
            (inc.resolvedAt ?? new Date()).getTime() - inc.startedAt.getTime();
          return (
            <li
              key={inc.id}
              className="p-5 flex items-start gap-4 hover:bg-[var(--surface-2)]/50 transition-colors"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  resolved
                    ? "bg-[var(--up-soft)] text-[var(--op-up)]"
                    : "bg-[var(--down-soft)] text-[var(--op-down)]"
                }`}
              >
                {resolved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--text)]">
                    {inc.monitor.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-subtle)] uppercase tracking-wider">
                    <TypeIcon className="w-3 h-3" />
                    {inc.monitor.type}
                  </span>
                </div>
                <div
                  className="text-xs font-mono text-[var(--text-muted)] truncate mt-0.5"
                  title={inc.monitor.target}
                >
                  {inc.monitor.target}
                </div>
                {inc.cause && (
                  <div className="text-xs text-[var(--op-down)] mt-2 bg-[var(--down-soft)] rounded-md px-2 py-1 inline-block">
                    {inc.cause}
                  </div>
                )}
                <div className="text-[10px] text-[var(--text-subtle)] mt-2 flex items-center gap-3">
                  <span>Started {formatAbs(inc.startedAt)}</span>
                  {inc.resolvedAt && <span>Resolved {formatAbs(inc.resolvedAt)}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
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
    </Card>
  );
}

function formatAbs(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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