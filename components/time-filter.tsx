"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TimeRange = "1h" | "4h" | "24h" | "7d" | "30d";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export function TimeFilter({ currentRange }: { currentRange: TimeRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticRange, setOptimisticRange] = useState<TimeRange>(currentRange);

  const handleClick = (range: TimeRange) => {
    if (range === optimisticRange) return;
    
    // Immediate UI feedback - feels instant
    setOptimisticRange(range);
    
    // Navigate in background
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("range", range);
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  return (
    <div className="relative">
      {/* Top progress bar - corporate style */}
      {isPending && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[var(--surface-2)] rounded-full overflow-hidden z-20">
          <div className="h-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--accent)] animate-progress-bar" 
               style={{ 
                 backgroundSize: '200% 100%',
                 animation: 'progress 1s ease-in-out infinite'
               }} 
          />
        </div>
      )}
      
      <div className={`flex items-center gap-1 p-1 rounded-lg border transition-all duration-200 ${
        isPending 
          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' 
          : 'border-[var(--border)] bg-[var(--surface)]'
      }`}>
        {TIME_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => handleClick(range.value)}
            disabled={isPending}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${
              optimisticRange === range.value
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            } ${isPending && optimisticRange !== range.value ? 'opacity-50' : ''}`}
          >
            {/* Shimmer effect on active during loading */}
            {isPending && optimisticRange === range.value && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}