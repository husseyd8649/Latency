import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  CardBody,
  PageHeader,
} from "@/components/ui/primitives";
import { Globe, PlusCircle } from "lucide-react";
import { type MonitorRowData } from "@/components/monitor-row";
import { MonitorsTable } from "@/components/monitors-table";
import { RunAllButton } from "@/components/run-all-button";
import { DeleteAllButton } from "@/components/delete-all-button";
import { RegionFilterBar } from "@/components/region-filter-bar";
import { recentChecksForSparklines } from "@/lib/stats";
import { bulkUpdateInterval } from "./actions";
import { RegionFilterDropdown } from "@/components/region-filter-dropdown";

export default async function MonitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const regionParam = params.region?.trim() || null;

  // Fetch all regions first — needed for both filter resolution and dropdown
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

  const monitorWhere: {
    userId: string;
    regionId?: string | null;
  } = { userId: user.id };

  if (activeFilter) {
    monitorWhere.regionId = activeFilter.isUngrouped ? null : activeFilter.regionId;
  }

  // Now fetches lastStatus, lastResponseTimeMs, lastError, lastCheckedAt directly
  // No more DISTINCT ON query needed!
  const [monitors, totalCount] = await Promise.all([
    prisma.monitor.findMany({
      where: monitorWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        target: true,
        intervalSeconds: true,
        timeoutMs: true,
        expectedStatus: true,
        isPaused: true,
        createdAt: true,
        regionId: true,
        lastStatus: true,
        lastResponseTimeMs: true,
        lastError: true,
        lastCheckedAt: true,
      },
    }),
    prisma.monitor.count({ where: { userId: user.id } }),
  ]);

  const activeCount = monitors.filter((m) => !m.isPaused).length;
  const filteredCount = monitors.length;
  const monitorIds = monitors.map((m) => m.id);

  const sparklinesMap = await recentChecksForSparklines(monitorIds, 30);

  const rows: MonitorRowData[] = monitors.map((m) => {
    return {
      id: m.id,
      name: m.name,
      type: m.type,
      target: m.target,
      intervalSeconds: m.intervalSeconds,
      timeoutMs: m.timeoutMs,
      expectedStatus: m.expectedStatus,
      isPaused: m.isPaused,
      createdAt: m.createdAt.toISOString(),
      regionId: m.regionId,
      last: m.lastStatus
        ? {
            status: m.lastStatus,
            responseTimeMs: m.lastResponseTimeMs,
            checkedAt: (m.lastCheckedAt ?? m.createdAt).toISOString(),
            error: m.lastError,
          }
        : null,
      sparkline: sparklinesMap.get(m.id) ?? [],
    };
  });

  const regionListForTable = regions.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
  }));

  return (
    <>
      <PageHeader
  title="Monitors"
  description="All checks in your workspace."
  actions={
    <>
      <RegionFilterDropdown
        regions={regions.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          color: r.color,
        }))}
      />
      <BulkIntervalForm />
      <DeleteAllButton count={totalCount} />
      <RunAllButton count={activeCount} />
      <Link href="/dashboard/add">
        <Button size="sm">
          <PlusCircle className="w-3.5 h-3.5" />
          New monitor
        </Button>
      </Link>
    </>
  }
/>

      {activeFilter && (
        <RegionFilterBar
          region={{ name: activeFilter.name, color: activeFilter.color }}
          matchedCount={filteredCount}
          totalCount={totalCount}
        />
      )}

      {rows.length === 0 ? (
        <Card className="animate-fade-up">
          <CardBody className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <Globe className="w-5 h-5 text-[var(--text-subtle)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text)]">
              {activeFilter
                ? `No monitors in ${activeFilter.name}`
                : "No monitors yet"}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 mb-5">
              {activeFilter
                ? "Try clearing the filter or assign monitors to this region."
                : "Add your first HTTP, TCP or SSL check to start monitoring."}
            </div>
            {activeFilter ? (
              <Link href="/dashboard/monitors">
                <Button size="sm" variant="secondary">
                  Clear filter
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/add">
                <Button size="sm">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add monitor
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card className="animate-fade-up overflow-hidden">
          <MonitorsTable rows={rows} regions={regionListForTable} />
        </Card>
      )}
    </>
  );
}

function BulkIntervalForm() {
  return (
    <form action={bulkUpdateInterval} className="inline-flex items-center gap-1">
      <select
        name="seconds"
        defaultValue="900"
        className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--text)]"
        aria-label="New interval"
        title="Set interval for all monitors"
      >
        <option value="300">5 min</option>
        <option value="600">10 min</option>
        <option value="900">15 min</option>
        <option value="1800">30 min</option>
      </select>
      <button
        type="submit"
        className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        title="Bulk set interval for all monitors and re-stagger next checks"
      >
        Apply
      </button>
    </form>
  );
}