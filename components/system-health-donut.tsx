"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Tier = "GOOD" | "DEGRADED" | "CRITICAL";

const tierConfig: Record<Tier, { label: string; color: string; bgVar: string; borderVar: string }> = {
  GOOD: {
    label: "All Systems Operational",
    color: "var(--op-up)",
    bgVar: "var(--up-soft)",
    borderVar: "var(--op-up)",
  },
  DEGRADED: {
    label: "Degraded Performance",
    color: "var(--op-degraded)",
    bgVar: "var(--degraded-soft)",
    borderVar: "var(--op-degraded)",
  },
  CRITICAL: {
    label: "Critical Issues Detected",
    color: "var(--op-down)",
    bgVar: "var(--down-soft)",
    borderVar: "var(--op-down)",
  },
};

export function SystemHealthDonut({
  uptimePct,
  activeIncidents,
}: {
  uptimePct: number | null;
  activeIncidents: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tier = deriveTier(uptimePct, activeIncidents);
  const config = tierConfig[tier];
  const upVal = uptimePct ?? 100;
  const downVal = 100 - upVal;

  const data = [
    { name: "Up", value: upVal },
    { name: "Down", value: downVal },
  ];

  return (
    <div
      className="rounded-xl border p-5 flex items-center gap-6 animate-fade-up"
      style={{
        borderColor: `color-mix(in srgb, ${config.borderVar} 25%, transparent)`,
        backgroundColor: config.bgVar,
      }}
    >
      {/* Donut */}
      <div className="w-24 h-24 shrink-0 relative">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={42}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={config.color} />
                <Cell fill="var(--border)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full rounded-full border-4 border-[var(--border)]" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-[var(--text)] font-mono">
            {uptimePct != null ? `${upVal.toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="flex-1">
        <div className="text-lg font-semibold text-[var(--text)]">
          System Health
        </div>
        <div className="text-sm text-[var(--text-muted)] mt-0.5">
          {config.label}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
          <span>
            <span className="font-mono font-medium text-[var(--text)]">{activeIncidents}</span>{" "}
            active incident{activeIncidents !== 1 && "s"}
          </span>
          {uptimePct != null && (
            <span>
              <span className="font-mono font-medium text-[var(--text)]">{upVal.toFixed(2)}%</span>{" "}
              uptime (24h)
            </span>
          )}
        </div>
      </div>

      {/* Tier badge */}
      <div
        className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
        style={{
          color: config.color,
          backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
        }}
      >
        {tier}
      </div>
    </div>
  );
}

function deriveTier(uptimePct: number | null, activeIncidents: number): Tier {
  const uptime = uptimePct ?? 100;
  if (activeIncidents > 5 || uptime < 95) return "CRITICAL";
  if (activeIncidents >= 1 || uptime < 99) return "DEGRADED";
  return "GOOD";
}