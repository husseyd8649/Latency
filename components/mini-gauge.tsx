"use client";

import { useState, useEffect } from "react";

export function MiniGauge({
  value,
  color = "var(--op-up)",
  max = 100,
}: {
  value: number;
  color?: string;
  max?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = -90 + (pct / 100) * 180;

  return (
    <div className="w-14 h-8 shrink-0 relative">
      <svg viewBox="0 0 80 44" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 8 40 A 32 32 0 0 1 72 40"
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {mounted && (
          <path
            d={describeArc(40, 40, 32, -90, angle)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            style={{
              transition: "all 600ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        )}
      </svg>
    </div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + Math.cos(startRad) * r;
  const y1 = cy + Math.sin(startRad) * r;
  const x2 = cx + Math.cos(endRad) * r;
  const y2 = cy + Math.sin(endRad) * r;

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}