"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Network,
  ShieldCheck,
  Pause,
  Play,
  Trash2,
  Zap,
  Pencil,
} from "lucide-react";
import { Badge, StatusDot } from "@/components/ui/primitives";
import { Sparkline } from "@/components/sparkline";
import { deleteMonitor, togglePause } from "@/app/dashboard/monitors/actions";
import { runNow } from "@/app/dashboard/monitors/run-now";
import {
  EditMonitorModal,
  type EditableMonitor,
} from "@/components/edit-monitor-modal";
import { cn } from "@/lib/utils";

const typeIconMap = {
  HTTP: Globe,
  TCP: Network,
  SSL: ShieldCheck,
} as const;

type Region = {
  id: string;
  name: string;
  color: string;
};

export type MonitorRowData = {
  id: string;
  name: string;
  type: "HTTP" | "TCP" | "SSL";
  target: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number | null;
  isPaused: boolean;
  createdAt: string;
  regionId: string | null;
  
  last: {
    status: "UP" | "DOWN";
    responseTimeMs: number | null;
    checkedAt: string;
    error: string | null;
  } | null;
  sparkline: { t: number; v: number | null }[];
  accept401?: boolean;
  accept403?: boolean;
  accept429?: boolean;
};

export function MonitorRow({
  m,
  regions = [],
}: {
  m: MonitorRowData;
  regions?: Region[];
}) {
  const [editing, setEditing] = useState(false);

  const TypeIcon = typeIconMap[m.type];
  const state = deriveState(m.isPaused, m.last?.status);

  const editable: EditableMonitor = {
    id: m.id,
    name: m.name,
    type: m.type,
    target: m.target,
    intervalSeconds: m.intervalSeconds,
    timeoutMs: m.timeoutMs,
    expectedStatus: m.expectedStatus,
    regionId: m.regionId,
  };

  return (
    <>
      <tr className="border-b border-[var(--border)] last:border-0 group transition-colors duration-200 hover:bg-[var(--surface-2)]/50">
        <td className="px-3 py-3 align-middle pl-5">
          <StatusDot variant={state.dot} />
        </td>
        <td className="px-3 py-3 align-middle">
          <div className="font-medium text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]">
            {m.name}
          </div>
          <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
            <RelativeTime
              iso={m.last ? m.last.checkedAt : m.createdAt}
              prefix={m.last ? "Last check" : "Created"}
            />
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
            {m.last?.responseTimeMs != null
              ? `${m.last.responseTimeMs}ms`
              : "—"}
          </span>
        </td>
        <td className="px-3 py-3 align-middle">
          <Badge variant={state.badge}>{state.label}</Badge>
          {m.last?.error && (
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
            <ActionButton
              onClick={() => setEditing(true)}
              title="Edit"
              hoverClass="hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <Pencil className="w-3.5 h-3.5" />
            </ActionButton>

            <form action={runNow}>
              <input type="hidden" name="id" value={m.id} />
              <ActionButton
                type="submit"
                title="Run now"
                disabled={m.isPaused}
                hoverClass="hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <Zap className="w-3.5 h-3.5" />
              </ActionButton>
            </form>

            <form action={togglePause}>
              <input type="hidden" name="id" value={m.id} />
              <ActionButton
                type="submit"
                title={m.isPaused ? "Resume" : "Pause"}
                hoverClass="hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                {m.isPaused ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </ActionButton>
            </form>

            <form action={deleteMonitor}>
              <input type="hidden" name="id" value={m.id} />
              <ActionButton
                type="submit"
                title="Delete"
                hoverClass="hover:text-[var(--op-down)] hover:bg-[var(--down-soft)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </ActionButton>
            </form>
          </div>
        </td>
      </tr>

      <EditMonitorModal
        monitor={editable}
        open={editing}
        onClose={() => setEditing(false)}
        regions={regions}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared action button                                                       */
/* -------------------------------------------------------------------------- */

function ActionButton({
  children,
  title,
  onClick,
  type = "button",
  disabled,
  hoverClass = "hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  hoverClass?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md text-[var(--text-muted)] transition-all duration-200 active:scale-90",
        "disabled:opacity-40 disabled:pointer-events-none",
        hoverClass
      )}
      title={title}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function RelativeTime({ iso, prefix }: { iso: string; prefix: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setText(formatRelative(new Date(iso)));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [iso]);

  if (text === null) {
    return <span>&nbsp;</span>;
  }
  return (
    <span>
      {prefix} {text}
    </span>
  );
}

function deriveState(paused: boolean, last?: "UP" | "DOWN") {
  if (paused)
    return {
      dot: "neutral" as const,
      badge: "neutral" as const,
      label: "Paused",
    };
  if (!last)
    return {
      dot: "neutral" as const,
      badge: "neutral" as const,
      label: "Pending",
    };
  if (last === "UP")
    return { dot: "up" as const, badge: "up" as const, label: "Up" };
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