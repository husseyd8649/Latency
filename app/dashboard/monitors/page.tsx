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
import { recentChecksForSparklines } from "@/lib/stats";
import { bulkUpdateInterval } from "./actions";

type LatestCheckRow = {
  monitorId: string;
  status: "UP" | "DOWN";
  responseTimeMs: number | null;
  checkedAt: Date;
  error: string | null;
};

export default async function MonitorsPage() {
  const user = await requireUser();

  const [monitors, regions] = await Promise.all([
    prisma.monitor.findMany({
      where: { userId: user.id },
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
      },
    }),
    prisma.region.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const activeCount = monitors.filter((m) => !m.isPaused).length;
  const totalCount = monitors.length;
  const monitorIds = monitors.map((m) => m.id);

  const latestChecks =
    monitorIds.length > 0
      ? await prisma.$queryRaw<LatestCheckRow[]>`
          SELECT DISTINCT ON ("monitorId")
            "monitorId",
            "status"::text as status,
            "responseTimeMs",
            "checkedAt",
            "error"
          FROM "Check"
          WHERE "monitorId" = ANY(${monitorIds}::text[])
          ORDER BY "monitorId", "checkedAt" DESC
        `
      : [];

  const latestByMonitor = new Map(
    latestChecks.map((c) => [c.monitorId, c])
  );

    const sparklinesMap = await recentChecksForSparklines(monitorIds, 30);

const rows: MonitorRowData[] = monitors.map((m) => {
      const latest = latestByMonitor.get(m.id);
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
      last: latest
        ? {
            status: latest.status,
            responseTimeMs: latest.responseTimeMs,
            checkedAt: latest.checkedAt.toISOString(),
            error: latest.error,
          }
        : null,
          sparkline: sparklinesMap.get(m.id) ?? [],    };
  });

  return (
    <>
      <PageHeader
        title="Monitors"
        description="All checks in your workspace."
        actions={
          <>
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

      {rows.length === 0 ? (
        <Card className="animate-fade-up">
          <CardBody className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <Globe className="w-5 h-5 text-[var(--text-subtle)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text)]">
              No monitors yet
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 mb-5">
              Add your first HTTP, TCP or SSL check to start monitoring.
            </div>
            <Link href="/dashboard/add">
              <Button size="sm">
                <PlusCircle className="w-3.5 h-3.5" />
                Add monitor
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card className="animate-fade-up overflow-hidden">
          <MonitorsTable rows={rows} regions={regions} />
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