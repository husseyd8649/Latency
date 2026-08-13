"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Search, X, Filter } from "lucide-react";
import { MonitorRow, type MonitorRowData } from "@/components/monitor-row";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

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

export function MonitorsTable({
  rows,
  regions = [],
}: {
  rows: MonitorRowData[];
  regions?: Region[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filter and sort logic
  const filteredAndSorted = useMemo(() => {
    // First filter
    let filtered = rows.filter((row) => {
      // Text search (name or target)
      const matchesSearch = 
        searchQuery === "" ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.target.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const currentStatus = statusKey(row);
      const matchesStatus = 
        statusFilter === "all" || 
        currentStatus === statusFilter;
      
      // Type filter
      const matchesType = 
        typeFilter === "all" || 
        row.type.toLowerCase() === typeFilter.toLowerCase();
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Then sort
    if (!sortKey) return filtered;

    const copy = [...filtered];
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
  }, [rows, sortKey, sortDir, searchQuery, statusFilter, typeFilter]);

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

  const hasActiveFilters = searchQuery || statusFilter !== "all" || typeFilter !== "all";
  
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface)]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="paused">Paused</option>
            <option value="pending">Pending</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="http">HTTP</option>
            <option value="tcp">TCP</option>
            <option value="ssl">SSL</option>
          </select>

          {/* Clear button */}
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearFilters}
              className="h-10"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
        <span>
          Showing {filteredAndSorted.length} of {rows.length} monitors
        </span>
        {hasActiveFilters && (
          <span className="text-[var(--accent)]">
            Filters active
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
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
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                  <div className="text-sm font-medium">No monitors match your filters</div>
                  <div className="text-xs mt-1">Try adjusting your search or filters</div>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row) => (
                <MonitorRow key={row.id} m={row} regions={regions} />
              ))
            )}
          </tbody>
        </table>
      </div>
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

/* -------------------------------------------------------------------------- */

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