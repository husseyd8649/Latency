"use client";

import { useState, useEffect } from "react";

const CX = 120;
const CY = 130;
const R_OUTER = 100;
const R_INNER = 78;
const ARC_STROKE = 12;
const START_ANGLE = 180;
const END_ANGLE = 360;
const TOTAL_ANGLE = END_ANGLE - START_ANGLE;

/**
 * Compact gauge for landing page hero/preview.
 * Static teal-blue gradient, no needle sweep animation on mount.
 */
export function LandingMiniGauge({
  value,
  label,
  displayValue,
  tierLabel,
}: {
  value: number;
  label: string;
  displayValue: string;
  tierLabel: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pct = Math.min(100, Math.max(0, value));
  const valueAngle = START_ANGLE + (pct / 100) * TOTAL_ANGLE;

  return (
    <div className="relative">
      <div className="w-full max-w-[240px]" style={{ minHeight: "160px" }}>
        {mounted && (
          <svg viewBox="0 0 240 160" className="w-full h-auto">
            <defs>
              <linearGradient id="landing-arc-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2DD4BF" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <filter id="landing-arc-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="landing-hub-grad" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#2563EB" />
              </radialGradient>
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
            <path
              d={arcPath(CX, CY, R_OUTER, START_ANGLE, valueAngle)}
              fill="none"
              stroke="url(#landing-arc-grad)"
              strokeWidth={ARC_STROKE}
              strokeLinecap="round"
              filter="url(#landing-arc-glow)"
            />

            {/* Inner reference arc */}
            <path
              d={arcPath(CX, CY, R_INNER, START_ANGLE, END_ANGLE)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Needle */}
            <g transform={`rotate(${round(valueAngle - 270)} ${CX} ${CY})`}>
              <polygon
                points={`${CX - 4},${CY} ${CX + 4},${CY} ${CX + 1},${CY - R_INNER + 6} ${CX - 1},${CY - R_INNER + 6}`}
                fill="#2563EB"
              />
              <circle cx={CX} cy={CY - R_INNER + 6} r={3} fill="#2563EB" />
            </g>

            {/* Center hub */}
            <circle
              cx={CX}
              cy={CY}
              r={16}
              fill="var(--surface)"
              stroke="var(--border)"
              strokeWidth={2}
            />
            <circle cx={CX} cy={CY} r={10} fill="url(#landing-hub-grad)" />

            {/* Center text */}
            <text
              x={CX}
              y={CY - 50}
              fontSize="9"
              fontWeight="700"
              fill="var(--text-muted)"
              textAnchor="middle"
              letterSpacing="2"
            >
              {label}
            </text>
            <text
              x={CX}
              y={CY - 25}
              fontSize="24"
              fontWeight="800"
              fill="var(--text)"
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {displayValue}
            </text>
            <text
              x={CX}
              y={CY - 8}
              fontSize="9"
              fontWeight="700"
              fill="#10B981"
              textAnchor="middle"
              letterSpacing="1.5"
            >
              {tierLabel}
            </text>
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