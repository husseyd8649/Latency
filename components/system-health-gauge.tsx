"use client";

import { useState, useEffect } from "react";

type Tier = "GOOD" | "DEGRADED" | "CRITICAL";

const tierConfig: Record<Tier, {
  label: string;
  color: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  GOOD: {
    label: "EXCELLENT",
    color: "var(--op-up)",
    glowColor: "var(--op-up)",
    gradientFrom: "#10B981",
    gradientTo: "#34D399",
  },
  DEGRADED: {
    label: "DEGRADED",
    color: "var(--op-degraded)",
    glowColor: "var(--op-degraded)",
    gradientFrom: "#F59E0B",
    gradientTo: "#FBBF24",
  },
  CRITICAL: {
    label: "CRITICAL",
    color: "var(--op-down)",
    glowColor: "var(--op-down)",
    gradientFrom: "#DC2626",
    gradientTo: "#FB7185",
  },
};

export function SystemHealthGauge({
  uptimePct,
  activeIncidents,
  totalMonitors,
  avgLatencyMs,
}: {
  uptimePct: number | null;
  activeIncidents: number;
  totalMonitors: number;
  avgLatencyMs: number | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tier = deriveTier(uptimePct, activeIncidents);
  const config = tierConfig[tier];
  const value = uptimePct ?? 100;

  // Semi-circular arc math
  // Total arc: 180 degrees (semicircle), from -90° (left) to 90° (right)
  // Value 0 = -90°, value 100 = 90°
  const angle = -90 + (value / 100) * 180;

  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-8 animate-fade-up overflow-hidden">
      {/* Subtle background glow behind gauge */}
      {mounted && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center top, ${config.glowColor}, transparent 60%)`,
          }}
        />
      )}

      <div className="relative flex items-center gap-8 flex-wrap">
        {/* Left: Gauge */}
        <div className="flex-1 min-w-[320px] flex flex-col items-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            System Health
          </div>

          {/* SVG Gauge */}
          <div className="relative w-full max-w-[400px] aspect-[2/1]">
            <svg viewBox="0 0 400 220" className="w-full h-full">
              <defs>
                <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={config.gradientFrom} />
                  <stop offset="100%" stopColor={config.gradientTo} />
                </linearGradient>
                <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background arc (unfilled portion) */}
              <path
                d="M 40 200 A 160 160 0 0 1 360 200"
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="24"
                strokeLinecap="round"
              />

              {/* Filled arc up to current value */}
              {mounted && (
                <path
                  d={describeArc(200, 200, 160, -90, angle)}
                  fill="none"
                  stroke="url(#gauge-gradient)"
                  strokeWidth="24"
                  strokeLinecap="round"
                  filter="url(#gauge-glow)"
                  style={{
                    transition: "all 800ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              )}

              {/* Tick marks around arc */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const tickAngle = -90 + (tick / 100) * 180;
                const rad = (tickAngle * Math.PI) / 180;
                const x1 = 200 + Math.cos(rad) * 180;
                const y1 = 200 + Math.sin(rad) * 180;
                const x2 = 200 + Math.cos(rad) * 190;
                const y2 = 200 + Math.sin(rad) * 190;
                const labelX = 200 + Math.cos(rad) * 205;
                const labelY = 200 + Math.sin(rad) * 205;
                return (
                  <g key={tick}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="var(--text-subtle)"
                      strokeWidth="1.5"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      fontSize="10"
                      fill="var(--text-subtle)"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="var(--font-mono)"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Needle */}
              {mounted && (
                <g
                  style={{
                    transformOrigin: "200px 200px",
                    transform: `rotate(${angle + 90}deg)`,
                    transition: "transform 800ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <line
                    x1="200"
                    y1="200"
                    x2="200"
                    y2="60"
                    stroke={config.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#gauge-glow)"
                  />
                  <circle cx="200" cy="200" r="10" fill={config.color} />
                  <circle cx="200" cy="200" r="5" fill="var(--surface)" />
                </g>
              )}
            </svg>

            {/* Centered value text (positioned absolutely over SVG) */}
            <div className="absolute inset-x-0 top-[45%] flex flex-col items-center pointer-events-none">
              <div className="font-mono text-5xl font-bold text-[var(--text)] leading-none">
                {uptimePct != null ? `${value.toFixed(1)}%` : "—"}
              </div>
              <div
                className="text-xs font-bold tracking-widest mt-1.5"
                style={{ color: config.color }}
              >
                {config.label}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stat readouts */}
        <div className="flex-1 min-w-[240px] space-y-4">
          <ReadoutRow
            label="Total Monitors"
            value={String(totalMonitors)}
            accent="var(--accent)"
          />
          <ReadoutRow
            label="Active Incidents"
            value={String(activeIncidents)}
            accent={activeIncidents > 0 ? "var(--op-down)" : "var(--op-up)"}
          />
          <ReadoutRow
            label="Avg. Latency"
            value={avgLatencyMs != null ? `${avgLatencyMs}ms` : "—"}
            accent="var(--accent)"
          />
          <ReadoutRow
            label="Uptime (24h)"
            value={uptimePct != null ? `${value.toFixed(2)}%` : "—"}
            accent={config.color}
          />
        </div>
      </div>
    </div>
  );
}

function ReadoutRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className="font-mono text-lg font-semibold"
        style={{ color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Helper: generate an SVG path for a circular arc.
 * cx, cy: center of circle
 * r: radius
 * startAngle, endAngle: in degrees (0 = right, -90 = top)
 */
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
  const sweep = 1;

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

function deriveTier(uptimePct: number | null, activeIncidents: number): Tier {
  const uptime = uptimePct ?? 100;
  if (activeIncidents > 5 || uptime < 95) return "CRITICAL";
  if (activeIncidents >= 1 || uptime < 99) return "DEGRADED";
  return "GOOD";
}