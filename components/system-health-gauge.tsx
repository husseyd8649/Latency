"use client";

import { useState, useEffect } from "react";

// SVG geometry
const CX = 250;
const CY = 240;
const R_OUTER = 195;
const R_INNER = 158;
const ARC_STROKE_OUTER = 16;
const ARC_STROKE_INNER = 3;
const START_ANGLE = 180;
const END_ANGLE = 360;
const TOTAL_ANGLE = END_ANGLE - START_ANGLE;

const MAJOR_TICKS = [0, 25, 50, 75, 100];
const MINOR_TICK_COUNT = 40;

// Teal-to-blue gradient palette (Corporate-friendly)
const GRADIENT_START = "#2DD4BF"; // teal-400
const GRADIENT_END = "#2563EB";   // blue-600 (matches Corporate accent)
const GLOW_COLOR = "#3B82F6";

function tierLabel(uptimePct: number | null): string {
  if (uptimePct == null) return "PENDING";
  if (uptimePct >= 99) return "EXCELLENT";
  if (uptimePct >= 95) return "GOOD";
  if (uptimePct >= 90) return "FAIR";
  return "POOR";
}

function tierColor(uptimePct: number | null): string {
  if (uptimePct == null) return "var(--text-muted)";
  if (uptimePct >= 99) return "#10B981";
  if (uptimePct >= 95) return "#059669";
  if (uptimePct >= 90) return "#F59E0B";
  return "#DC2626";
}

export function SystemHealthGauge({
  uptimePct,
  activeIncidents,
  avgLatencyMs,
  upCount,
  downCount,
  pausedCount,
}: {
  uptimePct: number | null;
  activeIncidents: number;
  avgLatencyMs: number | null;
  upCount: number;
  downCount: number;
  pausedCount: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const value = uptimePct ?? 100;
  const valueAngle = START_ANGLE + (value / 100) * TOTAL_ANGLE;
  const label = tierLabel(uptimePct);
  const labelColor = tierColor(uptimePct);
  // Display "97/100" style like the reference
  const displayValue = uptimePct != null ? Math.round(value) : 0;

  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-6 animate-fade-up overflow-hidden">
      {/* Soft ambient glow */}
      {mounted && (
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 55% at 50% 45%, ${GLOW_COLOR}, transparent 70%)`,
          }}
        />
      )}

      <div className="relative flex flex-col items-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
          Site Health
        </div>

        <div className="w-full max-w-[500px]" style={{ minHeight: "310px" }}>
          {mounted && (
            <svg viewBox="0 0 500 310" className="w-full h-auto">
              <defs>
                <linearGradient id="health-arc-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={GRADIENT_START} />
                  <stop offset="100%" stopColor={GRADIENT_END} />
                </linearGradient>

                <filter id="health-arc-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="health-needle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
                </filter>

                <radialGradient id="health-hub-gradient" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor={GRADIENT_END} />
                </radialGradient>
              </defs>

              {/* Background track */}
              <path
                d={arcPath(CX, CY, R_OUTER, START_ANGLE, END_ANGLE)}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth={ARC_STROKE_OUTER}
                strokeLinecap="round"
              />

              {/* Filled arc up to current value — gradient */}
              <path
                d={arcPath(CX, CY, R_OUTER, START_ANGLE, valueAngle)}
                fill="none"
                stroke="url(#health-arc-gradient)"
                strokeWidth={ARC_STROKE_OUTER}
                strokeLinecap="round"
                filter="url(#health-arc-glow)"
              />

              {/* Inner reference arc */}
              <path
                d={arcPath(CX, CY, R_INNER, START_ANGLE, END_ANGLE)}
                fill="none"
                stroke="var(--border)"
                strokeWidth={ARC_STROKE_INNER}
                strokeLinecap="round"
              />

              {/* Tick marks */}
              {Array.from({ length: MINOR_TICK_COUNT + 1 }).map((_, i) => {
                const isMajor = i % 10 === 0;
                const tickAngle = START_ANGLE + (i / MINOR_TICK_COUNT) * TOTAL_ANGLE;
                const inner = polarToCartesian(CX, CY, R_INNER - (isMajor ? 12 : 6), tickAngle);
                const outer = polarToCartesian(CX, CY, R_INNER - 2, tickAngle);
                return (
                  <line
                    key={`tick-${i}`}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={isMajor ? "var(--text-muted)" : "var(--text-subtle)"}
                    strokeWidth={isMajor ? 2 : 1}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Major tick labels */}
              {MAJOR_TICKS.map((tick) => {
                const tickAngle = START_ANGLE + (tick / 100) * TOTAL_ANGLE;
                const label = polarToCartesian(CX, CY, R_INNER - 28, tickAngle);
                return (
                  <text
                    key={`label-${tick}`}
                    x={label.x}
                    y={label.y}
                    fontSize="12"
                    fontWeight="600"
                    fill="var(--text-muted)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {tick}
                  </text>
                );
              })}

              {/* Center text — positioned above needle */}
              <text
                x={CX}
                y={CY - 90}
                fontSize="12"
                fontWeight="700"
                fill="var(--text-muted)"
                textAnchor="middle"
                letterSpacing="2"
              >
                SITE HEALTH
              </text>
              <text
                x={CX}
                y={CY - 50}
                fontSize="38"
                fontWeight="800"
                fill="var(--text)"
                textAnchor="middle"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {displayValue}
                <tspan fontSize="18" fill="var(--text-muted)" fontWeight="600">
                  /100
                </tspan>
              </text>
              <text
                x={CX}
                y={CY - 25}
                fontSize="13"
                fontWeight="700"
                fill={labelColor}
                textAnchor="middle"
                letterSpacing="2"
              >
                {label}
              </text>

              {/* Needle */}
              <g transform={`rotate(${round(valueAngle - 270)} ${CX} ${CY})`}>
                <polygon
                  points={`
                    ${CX - 5},${CY}
                    ${CX + 5},${CY}
                    ${CX + 1.5},${CY - R_INNER + 8}
                    ${CX - 1.5},${CY - R_INNER + 8}
                  `}
                  fill={GRADIENT_END}
                  filter="url(#health-needle-shadow)"
                />
                <circle
                  cx={CX}
                  cy={CY - R_INNER + 8}
                  r={4}
                  fill={GRADIENT_END}
                />
              </g>

              {/* Center hub */}
              <circle
                cx={CX}
                cy={CY}
                r={22}
                fill="var(--surface)"
                stroke="var(--border)"
                strokeWidth={2}
                filter="url(#health-needle-shadow)"
              />
              <circle cx={CX} cy={CY} r={14} fill="url(#health-hub-gradient)" />
              <circle cx={CX - 3} cy={CY - 4} r={3} fill="#ffffff" opacity="0.6" />
            </svg>
          )}
        </div>

                {/* Three sub-stats: Up / Down / Paused - Signal Ops Themed */}
        <div className="w-full mt-4 grid grid-cols-3 gap-3 px-2">
          {/* Up */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-2)] border border-green-500/20 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Up
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-green-600 dark:text-green-400">
              {upCount}
            </div>
          </div>

          {/* Down */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-2)] border border-red-500/20 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Down
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-red-600 dark:text-red-400">
              {downCount}
            </div>
          </div>

          {/* Paused */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-2)] border border-yellow-500/20 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Paused
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {pausedCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

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