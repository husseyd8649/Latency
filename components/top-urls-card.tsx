import { Card, CardBody } from "@/components/ui/primitives";
import { TrendingUp, Trophy, Medal, Award } from "lucide-react";

type TopUrl = {
  id: string;
  name: string;
  target: string;
  lastResponseTimeMs: number;
  uptimePct: number;
  spark: number[];
};

// Medal configuration: 1st = gold trophy, 2nd = silver medal, 3rd = bronze award, 4+ = numbered chip
const rankConfig = [
  {
    icon: Trophy,
    bg: "bg-amber-400/20",
    text: "text-amber-500",
    border: "border-amber-400/40",
  },
  {
    icon: Medal,
    bg: "bg-slate-400/20",
    text: "text-slate-500",
    border: "border-slate-400/40",
  },
  {
    icon: Award,
    bg: "bg-orange-500/20",
    text: "text-orange-600",
    border: "border-orange-500/40",
  },
];

export function TopUrlsCard({ urls }: { urls: TopUrl[] }) {
  return (
    <Card className="animate-fade-up h-full">
      <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text)] leading-tight">
              Top Performing
            </div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
              Fastest &amp; 100% Up
            </div>
          </div>
        </div>
        <div className="text-[10px] text-[var(--text-subtle)] shrink-0">
          Last 24h
        </div>
      </div>

      <CardBody className="p-0">
        {urls.length === 0 ? (
          <div className="text-center py-10 px-5">
            <TrendingUp className="w-8 h-8 text-[var(--text-subtle)] mx-auto mb-2" />
            <div className="text-xs text-[var(--text-muted)]">
              No fully-healthy monitors yet.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {urls.map((u, i) => {
              const medal = rankConfig[i];
              return (
                <li
                  key={u.id}
                  className="px-5 py-3 hover:bg-[var(--surface-2)]/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Medal or numbered chip */}
                    {medal ? (
                      <div
                        className={`w-8 h-8 rounded-full border ${medal.bg} ${medal.text} ${medal.border} flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)]`}
                        title={`Rank ${i + 1}`}
                      >
                        <medal.icon className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                    )}

                    {/* Name + target */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text)] truncate">
                        {u.name}
                      </div>
                      <div
                        className="text-[10px] font-mono text-[var(--text-subtle)] truncate"
                        title={u.target}
                      >
                        {u.target}
                      </div>
                    </div>

                    {/* Sparkline */}
                    <MiniSpark data={u.spark} />

                    {/* Latency */}
                    <div className="text-right shrink-0 min-w-[54px]">
                      <div className="font-mono text-sm font-bold text-[var(--accent)]">
                        {u.lastResponseTimeMs}
                        <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">
                          ms
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function MiniSpark({ data }: { data: number[] }) {
  if (data.length < 2) {
    return <div className="w-16 h-6 shrink-0" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 20;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="shrink-0"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-area)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}