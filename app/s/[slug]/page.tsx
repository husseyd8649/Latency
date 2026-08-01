// app/s/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dailyUptimeForMonitor } from "@/lib/stats";
import { UptimeBar } from "@/components/uptime-bar";
import { StatusDot, Badge } from "@/components/ui/primitives";
import { CheckCircle2, AlertTriangle, Globe } from "lucide-react";
import Link from "next/link";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await prisma.statusPage.findUnique({
    where: { slug },
    select: { title: true },
  });
  return {
    title: page ? `${page.title} · Status` : "Status Page",
  };
}

export default async function PublicStatusPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await prisma.statusPage.findUnique({
    where: { slug },
    include: {
      user: {
        select: { id: true }, // minimal, just to ensure relation exists
      },
    },
  });

  if (!page) notFound();

  // Fetch monitors (only selected ones, only safe fields)
  const monitors = await prisma.monitor.findMany({
    where: {
      id: { in: page.monitorIds },
      userId: page.userId, // safety: ensure these monitors belong to the page owner
    },
    select: {
      id: true,
      name: true,
      type: true,
      target: true,
      isPaused: true,
    },
  });

  // Fetch last check status and 30-day uptime for each monitor
  const monitorData = await Promise.all(
    monitors.map(async (m) => {
      const [lastCheck, uptimeDays] = await Promise.all([
        prisma.check.findFirst({
          where: { monitorId: m.id },
          orderBy: { checkedAt: "desc" },
          select: { status: true, checkedAt: true },
        }),
        dailyUptimeForMonitor(m.id, 30),
      ]);

      return {
        ...m,
        lastCheck,
        uptimeDays,
      };
    })
  );

  // Determine overall status
  const anyDown = monitorData.some((m) => !m.isPaused && m.lastCheck?.status === "DOWN");
  const allPaused = monitorData.length > 0 && monitorData.every((m) => m.isPaused);
  const operational = !anyDown && !allPaused;

  // Fetch recent incidents (last 30 days) for these monitors
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const incidents = await prisma.incident.findMany({
    where: {
      monitorId: { in: page.monitorIds },
      startedAt: { gte: since },
    },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      monitor: {
        select: { name: true, type: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">{page.title}</span>
          </div>
          <div className="text-xs text-[var(--text-subtle)]">
            Powered by{" "}
            <Link href="/" className="text-[var(--accent)] hover:underline">
              Latency
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Status banner */}
        <div
          className={`mb-8 rounded-xl border p-6 flex items-center gap-4 ${
            operational
              ? "border-[var(--op-up)]/25 bg-[var(--up-soft)]"
              : "border-[var(--op-down)]/25 bg-[var(--down-soft)]"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              operational ? "bg-[var(--op-up)] text-white" : "bg-[var(--op-down)] text-white"
            }`}
          >
            {operational ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-lg font-semibold">
              {operational ? "All Systems Operational" : "Experiencing Issues"}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {monitorData.length} component{monitorData.length !== 1 ? "s" : ""} monitored
            </div>
          </div>
        </div>

        {/* Monitor list */}
        <div className="space-y-4 mb-10">
          {monitorData.map((m) => {
            const status = m.isPaused
              ? "paused"
              : m.lastCheck?.status === "DOWN"
              ? "down"
              : "up";

            return (
              <div
                key={m.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <StatusDot
                      variant={status === "up" ? "up" : status === "down" ? "down" : "neutral"}
                    />
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-[var(--text-subtle)] font-mono">
                        {m.type} · {m.target}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={status === "up" ? "up" : status === "down" ? "down" : "neutral"}
                  >
                    {status === "up" ? "Operational" : status === "down" ? "Down" : "Paused"}
                  </Badge>
                </div>
                <UptimeBar days={m.uptimeDays} />
              </div>
            );
          })}
        </div>

        {/* Incidents */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-subtle)] mb-4">
            Recent Incidents
          </h2>
          {incidents.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] text-center py-8 border border-dashed border-[var(--border)] rounded-xl">
              No incidents in the last 30 days.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => {
                const resolved = !!inc.resolvedAt;
                const dur =
                  (inc.resolvedAt ?? new Date()).getTime() - inc.startedAt.getTime();
                const durStr = formatDuration(dur);

                return (
                  <div
                    key={inc.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{inc.monitor.name}</div>
                        <div className="text-xs text-[var(--text-subtle)] mt-0.5">
                          {inc.startedAt.toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {resolved ? `Resolved after ${durStr}` : `Ongoing (${durStr})`}
                        </div>
                        {inc.cause && (
                          <div className="text-xs text-[var(--op-down)] mt-2">
                            {inc.cause}
                          </div>
                        )}
                      </div>
                      <Badge variant={resolved ? "up" : "down"}>
                        {resolved ? "Resolved" : "Ongoing"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6">
        <div className="max-w-3xl mx-auto px-6 text-center text-xs text-[var(--text-subtle)]">
          <p>
            Status page by{" "}
            <Link href="/" className="text-[var(--accent)] hover:underline">
              Latency
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
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