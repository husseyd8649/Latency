// app/dashboard/monitors/page.tsx
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
import { recentChecksForSparkline } from "@/lib/stats";
import { bulkUpdateInterval } from "./actions";

export default async function MonitorsPage() {
  const user = await requireUser();

  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: {
          status: true,
          responseTimeMs: true,
          checkedAt: true,
          error: true,
        },
      },
    },
  });

  const activeCount = monitors.filter((m) => !m.isPaused).length;
  const totalCount = monitors.length;

  const sparklines = await Promise.all(
    monitors.map((m) => recentChecksForSparkline(m.id, 30))
  );

  const rows: MonitorRowData[] = monitors.map((m, i) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    target: m.target,
    intervalSeconds: m.intervalSeconds,
    timeoutMs: m.timeoutMs,
    expectedStatus: m.expectedStatus,
    isPaused: m.isPaused,
    createdAt: m.createdAt.toISOString(),
    last: m.checks[0]
      ? {
          status: m.checks[0].status,
          responseTimeMs: m.checks[0].responseTimeMs,
          checkedAt: m.checks[0].checkedAt.toISOString(),
          error: m.checks[0].error,
        }
      : null,
    sparkline: sparklines[i],
  }));

  return (
    <>
            <PageHeader
        title="Monitors"
        description="All checks in your workspace."
        actions={
          <>
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
          <MonitorsTable rows={rows} />
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
