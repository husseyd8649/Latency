"use client";

import { useState, useEffect } from "react";

// Static sparkline data — represents "healthy latency trend"
const DATA = [180, 195, 172, 168, 185, 190, 176, 182, 178, 174, 188, 184];

export function LandingMiniSparkline() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const min = Math.min(...DATA);
  const max = Math.max(...DATA);
  const range = max - min || 1;
  const w = 200;
  const h = 40;
  const step = w / (DATA.length - 1);

  const points = DATA.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  if (!mounted) return <div style={{ width: w, height: h }} />;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="landing-spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#landing-spark-area)" />
      <polyline
        points={points}
        fill="none"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}