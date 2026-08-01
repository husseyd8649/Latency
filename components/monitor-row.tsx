// components/monitor-row.tsx
"use client";

import { useState } from "react";
import { Globe, Network, ShieldCheck, Pause, Play, Trash2, Zap, FlaskConical } from "lucide-react";
import { Badge, StatusDot } from "@/components/ui/primitives";
import { Sparkline } from "@/components/sparkline";
import { deleteMonitor, togglePause } from "@/app/dashboard/monitors/actions";
import { runNow } from "@/app/dashboard/monitors/run-now";
import { cn } from "@/lib/utils";

const typeIconMap = {
  HTTP: Globe,
  TCP: Network,
  SSL: ShieldCheck,
} as const;

export type MonitorRowData = {
  id: string;
  name: string;
  type: "HTTP" | "TCP" | "SSL";
  target: string;
  intervalSeconds: number;
  isPaused: boolean;
  createdAt: string; // serialized
  last: {
    status: "UP" | "DOWN";
    responseTimeMs: number | null;
    checkedAt: string;
    error: string | null;
  } | null;
  sparkline: { t: number; v: number | null }[];
};

export function MonitorRow({ m }: { m: MonitorRowData }) {
  const [simulated, setSimulated] = useState(false);

  const TypeIcon = typeIconMap[m.type];
  const realState = deriveState(m.isPaused, m.last?.status);
  const state = simulated
    ? { dot: "down" as const, badge: "down" as const, label: "Simulated" }
    : realState;

  return (
    <tr
      className={cn(
        "border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors",
        simulated && "bg-[var(--down-soft)]"
      )}
    >
      <td className="px-3 py-3 align-middle pl-5">
        <StatusDot variant={state.dot} />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="font-medium text-[var(--text)]">{m.name}</div>
        <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
          {m.last
            ? `Last check ${formatRelative(new Date(m.last.checkedAt))}`
            : `Created ${formatRelative(new Date(m.createdAt))}`}
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <TypeIcon className="w-3.5 h-3.5" />
          {m.type}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <span
          className="font-mono text-xs text-[var(--text-muted)] truncate max-w-[200px] inline-block align-middle"
          title={m.target}
        >
          {m.target}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <Sparkline data={m.sparkline} />
      </td>
      <td className="px-3 py-3 align-middle">
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {m.last?.responseTimeMs != null ? `${m.last.responseTimeMs}ms` : "—"}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <Badge variant={state.badge}>{state.label}</Badge>
        {!simulated && m.last?.error && (
          <div
            className="text-[10px] text-[var(--op-down)] mt-1 truncate max-w-[200px]"
            title={m.last.error}
          >
            {m.last.error}
          </div>
        )}
      </td>
      <td className="px-3 py-3 align-middle text-right pr-5">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSimulated((s) => !s)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              simulated
                ? "text-[var(--op-down)] bg-[var(--down-soft)]"
                : "text-[var(--text-muted)] hover:text-[var(--op-degraded)] hover:bg-[var(--surface-2)]"
            )}
            title={simulated ? "Stop simulation" : "Simulate incident (visual only)"}
          >
            <FlaskConical className="w-3.5 h-3.5" />
          </button>
          <form action={runNow}>
            <input type="hidden" name="id" value={m.id} />
            <button
              type="submit"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title="Run now"
              disabled={m.isPaused}
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </form>
          <form action={togglePause}>
            <input type="hidden" name="id" value={m.id} />
            <button
              type="submit"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              title={m.isPaused ? "Resume" : "Pause"}
            >
              {m.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </form>
          <form action={deleteMonitor}>
            <input type="hidden" name="id" value={m.id} />
            <button
              type="submit"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------------------- */

function deriveState(paused: boolean, last?: "UP" | "DOWN") {
  if (paused) return { dot: "neutral" as const, badge: "neutral" as const, label: "Paused" };
  if (!last) return { dot: "neutral" as const, badge: "neutral" as const, label: "Pending" };
  if (last === "UP") return { dot: "up" as const, badge: "up" as const, label: "Up" };
  return { dot: "down" as const, badge: "down" as const, label: "Down" };
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}