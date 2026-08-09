"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function MiniDonut({
  value,
  color = "var(--op-up)",
}: {
  value: number;
  color?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-10 h-10 shrink-0 rounded-full border-2 border-[var(--border)]" />;
  }

  const data = [
    { name: "filled", value },
    { name: "empty", value: 100 - value },
  ];

  return (
    <div className="w-10 h-10 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={13}
            outerRadius={19}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="var(--border)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}