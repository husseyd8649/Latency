// components/uptime-chart.tsx
"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { hour: string; avgMs: number | null; checks: number };

export function UptimeChart({ data }: { data: Point[] }) {
  if (!data || data.every((d) => d.avgMs === null)) {
    return (
      <div className="h-56 rounded-lg grid-bg flex items-center justify-center text-xs text-[var(--text-subtle)]">
        No check data in the last 24 hours
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="fillCoral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            stroke="var(--text-subtle)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--text-subtle)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={40}
            unit="ms"
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
            }}
            labelStyle={{ color: "var(--text-muted)", fontSize: 10 }}
            formatter={(value) =>
              typeof value === "number" ? `${value} ms` : "—"
            }
          />
          <Area
            type="monotone"
            dataKey="avgMs"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#fillCoral)"
            isAnimationActive={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}