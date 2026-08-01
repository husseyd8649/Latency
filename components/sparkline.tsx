// components/sparkline.tsx
"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

type Point = { t: number; v: number | null };

export function Sparkline({ data }: { data: Point[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-6 w-24 flex items-center justify-center">
        <span className="text-[10px] text-[var(--text-subtle)]">—</span>
      </div>
    );
  }

  return (
    <div className="h-6 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke="var(--accent)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}