// components/uptime-bar.tsx
"use client";

type Day = { date: string; up: boolean | null };

export function UptimeBar({ days }: { days: Day[] }) {
  if (!days || days.length === 0) return null;

  const upCount = days.filter((d) => d.up === true).length;
  const total = days.filter((d) => d.up !== null).length;
  const pct = total === 0 ? 0 : Math.round((upCount / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">{days.length} days</span>
        <span className="font-mono text-[var(--text)]">{pct}% uptime</span>
      </div>
      <div className="flex gap-0.5 h-2">
        {days.map((d, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${
              d.up === null
                ? "bg-[var(--border)]"
                : d.up
                ? "bg-[var(--op-up)]"
                : "bg-[var(--op-down)]"
            }`}
            title={d.date}
          />
        ))}
      </div>
    </div>
  );
}