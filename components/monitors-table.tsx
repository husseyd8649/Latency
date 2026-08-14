"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { MonitorRow, type MonitorRowData } from "@/components/monitor-row";
import { cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "type"
  | "target"
  | "latency"
  | "status"
  | "interval"
  | null;
type SortDir = "asc" | "desc";

type Region = {
  id: string;
  name: string;
  color: string;
};

const STATUS_ORDER: Record<string, number> = {
  down: 0,
  degraded: 1,
  up: 2,
  paused: 3,
  pending: 4,
};

function statusKey(m: MonitorRowData): string {
  if (m.isPaused) return "paused";
  if (!m.last) return "pending";
  return m.last.status.toLowerCase();
}

// Client-side sorting only (filtering is now server-side in page.tsx)
export function MonitorsTable({
  rows,
  regions = [],
}: {
  rows: MonitorRowData[];
  regions?: Region[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Only sorting (no filtering - already done server-side)
  const sorted = useMemo(() => {
    if (!sortKey) return rows;

    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            <Th className="w-8" />
            <SortableTh
              label="Name"
              active={sortKey === "name"}
              dir={sortDir}
              onClick={() => handleSort("name")}
            />
            <SortableTh
              label="Type"
              active={sortKey === "type"}
              dir={sortDir}
              onClick={() => handleSort("type")}
            />
            <SortableTh
              label="Target"
              active={sortKey === "target"}
              dir={sortDir}
              onClick={() => handleSort("target")}
            />
            <Th>Trend</Th>
            <SortableTh
              label="Latency"
              active={sortKey === "latency"}
              dir={sortDir}
              onClick={() => handleSort("latency")}
            />
            <SortableTh
              label="Status"
              active={sortKey === "status"}
              dir={sortDir}
              onClick={() => handleSort("status")}
            />
            <Th className="text-right pr-5">Actions</Th>
          </tr>
        </thead>
        <tbody className="stagger-list">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                <div className="text-sm font-medium">No monitors found</div>
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <MonitorRow key={row.id} m={row} regions={regions} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function sortValue(m: MonitorRowData, key: Exclude<SortKey, null>) {
  switch (key) {
    case "name":
      return m.name;
    case "type":
      return m.type;
    case "target":
      return m.target;
    case "latency":
      return m.last?.responseTimeMs ?? null;
    case "status":
      return STATUS_ORDER[statusKey(m)] ?? 99;
    case "interval":
      return m.intervalSeconds;
  }
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-3 py-2.5",
        className
      )}
    >
      {children}
    </th>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-3 py-2.5">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors",
          active && "text-[var(--text)]"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <span className="w-3 h-3 opacity-30">
            <ChevronUp className="w-3 h-3" />
          </span>
        )}
      </button>
    </th>
  );
}