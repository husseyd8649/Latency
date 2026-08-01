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
import { MonitorRow, type MonitorRowData } from "@/components/monitor-row";
import { recentChecksForSparkline } from "@/lib/stats";

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

  // Fetch sparkline data in parallel
  const sparklines = await Promise.all(
    monitors.map((m) => recentChecksForSparkline(m.id, 30))
  );

  const rows: MonitorRowData[] = monitors.map((m, i) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    target: m.target,
    intervalSeconds: m.intervalSeconds,
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
            <div className="text-sm font-medium text-[var(--text)]">No monitors yet</div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <Th className="w-8" />
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Target</Th>
                  <Th>Trend</Th>
                  <Th>Latency</Th>
                  <Th>Status</Th>
                  <Th className="text-right pr-5">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <MonitorRow key={row.id} m={row} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-3 py-2.5 ${
        className ?? ""
      }`}
    >
      {children}
    </th>
  );
}
