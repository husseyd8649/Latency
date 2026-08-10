"use client";

import { useState, useEffect } from "react";

const CX = 130;
const CY = 145;
const R_OUTER = 112;
const ARC_STROKE = 14;
const START_ANGLE = 180;
const END_ANGLE = 360;
const TOTAL_ANGLE = END_ANGLE - START_ANGLE;

export function DashboardGaugeCard({
  label,
  value,
  displayValue,
  color = "#10B981",
  maxValue = 100,
  subtitle,
}: {
  label: string;
  value: number;
  displayValue: string;
  color?: string;
  maxValue?: number;
  subtitle?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pct = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const valueAngle = START_ANGLE + (pct / 100) * TOTAL_ANGLE;
  const endPoint = polarToCartesian(CX, CY, R_OUTER, valueAngle);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] p-6 animate-fade-up flex flex-col items-center justify-center h-full">
      <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
        {label}
      </div>

      <div className="w-full max-w-[280px] relative flex-1 flex items-center justify-center">
        {mounted && (
          <svg viewBox="0 0 260 200" className="w-full h-auto">
            <defs>
              <filter id={`gauge-glow-${label.replace(/\s/g, "-")}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <path
              d={arcPath(CX, CY, R_OUTER, START_ANGLE, END_ANGLE)}
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth={ARC_STROKE}
              strokeLinecap="round"
            />

            {/* Filled arc */}
            {pct > 0 && (
              <path
                d={arcPath(CX, CY, R_OUTER, START_ANGLE, valueAngle)}
                fill="none"
                stroke={color}
                strokeWidth={ARC_STROKE}
                strokeLinecap="round"
                filter={`url(#gauge-glow-${label.replace(/\s/g, "-")})`}
              />
            )}

            {/* Endpoint dot */}
            {pct > 0 && (
              <circle
                cx={endPoint.x}
                cy={endPoint.y}
                r={7}
                fill={color}
                filter={`url(#gauge-glow-${label.replace(/\s/g, "-")})`}
              />
            )}

            {/* Start/end scale labels */}
            <text
              x="18"
              y="188"
              fontSize="11"
              fill="var(--text-subtle)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              0
            </text>
            <text
              x="242"
              y="188"
              fontSize="11"
              fill="var(--text-subtle)"
              textAnchor="end"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {maxValue >= 1000 ? `${Math.round(maxValue / 1000)}K` : maxValue}
            </text>

            {/* Centered value + subtitle inside gauge */}
            <text
              x={CX}
              y={CY - 30}
              fontSize="36"
              fontWeight="800"
              fill="var(--text)"
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {displayValue}
            </text>
            {subtitle && (
              <text
                x={CX}
                y={CY - 5}
                fontSize="11"
                fill="var(--text-muted)"
                textAnchor="middle"
              >
                {subtitle}
              </text>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: round(cx + r * Math.cos(rad)),
    y: round(cy + r * Math.sin(rad)),
  };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const angleSpan = endAngle - startAngle;
  const largeArcFlag = angleSpan > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}