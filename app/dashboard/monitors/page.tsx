import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  CardBody,
  PageHeader,
} from "@/components/ui/primitives";
import { Globe, PlusCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { type MonitorRowData } from "@/components/monitor-row";
import { MonitorsTable } from "@/components/monitors-table";
import { RunAllButton } from "@/components/run-all-button";
import { DeleteAllButton } from "@/components/delete-all-button";
import { RegionFilterBar } from "@/components/region-filter-bar";
import { recentChecksForSparklines } from "@/lib/stats";
import { bulkUpdateInterval } from "./actions";
import { RegionFilterDropdown } from "@/components/region-filter-dropdown";
import { MonitorFilters } from "@/components/monitor-filters";

const ITEMS_PER_PAGE = 25;

export default async function MonitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    region?: string; 
    page?: string;
    search?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const regionParam = params.region?.trim() || null;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const searchQuery = params.search?.trim() || "";
  const statusFilter = params.status || "all";
  const typeFilter = params.type || "all";
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const regions = await prisma.region.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, color: true },
  });

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

  // Build where clause with ALL filters
  const monitorWhere: any = { 
    userId: user.id,
  };

  if (activeFilter) {
    monitorWhere.regionId = activeFilter.isUngrouped ? null : activeFilter.regionId;
  }

  // Add search filter (name OR target)
  if (searchQuery) {
    monitorWhere.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { target: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  // Add status filter
  if (statusFilter !== "all") {
    if (statusFilter === "paused") {
      monitorWhere.isPaused = true;
    } else if (statusFilter === "up") {
      monitorWhere.isPaused = false;
      monitorWhere.lastStatus = "UP";
    } else if (statusFilter === "down") {
      monitorWhere.isPaused = false;
      monitorWhere.lastStatus = "DOWN";
    } else if (statusFilter === "pending") {
      monitorWhere.isPaused = false;
      monitorWhere.lastStatus = null;
    }
  }

  // Add type filter
  if (typeFilter !== "all") {
    monitorWhere.type = typeFilter.toUpperCase();
  }

  // Get total count with ALL filters applied
  const totalCount = await prisma.monitor.count({ where: monitorWhere });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Reset to page 1 if current page is out of bounds after filtering
  const validPage = Math.min(currentPage, Math.max(1, totalPages));
  const validSkip = (validPage - 1) * ITEMS_PER_PAGE;

  const [monitors, allMonitorsCount] = await Promise.all([
    prisma.monitor.findMany({
      where: monitorWhere,
      orderBy: { createdAt: "desc" },
      take: ITEMS_PER_PAGE,
      skip: validSkip,
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
        accept401: true,
        accept403: true,
        accept429: true,
      },
    }),
    prisma.monitor.count({ where: { userId: user.id } }),
  ]);

  const activeCount = await prisma.monitor.count({ 
    where: { userId: user.id, isPaused: false } 
  });
  
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

  // Build filter params for pagination links
  const filterParams = new URLSearchParams();
  if (regionParam) filterParams.set("region", regionParam);
  if (searchQuery) filterParams.set("search", searchQuery);
  if (statusFilter !== "all") filterParams.set("status", statusFilter);
  if (typeFilter !== "all") filterParams.set("type", typeFilter);

  return (
    <>
      <PageHeader
        title="Monitors"
        description={`Showing ${validSkip + 1}-${Math.min(validSkip + ITEMS_PER_PAGE, totalCount)} of ${totalCount} monitors`}
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
            <DeleteAllButton count={allMonitorsCount} />
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
          matchedCount={totalCount}
          totalCount={allMonitorsCount}
        />
      )}

      {/* Search & Filter Bar - Client Component */}
      <MonitorFilters 
        currentSearch={searchQuery}
        currentStatus={statusFilter}
        currentType={typeFilter}
      />

      {rows.length === 0 ? (
        <Card className="animate-fade-up">
          <CardBody className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <Globe className="w-5 h-5 text-[var(--text-subtle)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text)]">
              {activeFilter || searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "No monitors match your filters"
                : "No monitors yet"}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 mb-5">
              {activeFilter || searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first HTTP, TCP or SSL check to start monitoring."}
            </div>
            {(activeFilter || searchQuery || statusFilter !== "all" || typeFilter !== "all") ? (
              <Link href="/dashboard/monitors">
                <Button size="sm" variant="secondary">
                  Clear all filters
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
        <>
          <Card className="animate-fade-up overflow-hidden">
            <MonitorsTable rows={rows} regions={regionListForTable} />
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-[var(--text-muted)]">
                Page {validPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                {validPage > 1 && (
                  <Link 
                    href={`/dashboard/monitors?${filterParams.toString()}&page=${validPage - 1}`}
                  >
                    <Button variant="secondary" size="sm">
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                  </Link>
                )}
                {validPage < totalPages && (
                  <Link 
                    href={`/dashboard/monitors?${filterParams.toString()}&page=${validPage + 1}`}
                  >
                    <Button variant="secondary" size="sm">
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
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