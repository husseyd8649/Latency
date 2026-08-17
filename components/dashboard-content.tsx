"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TransitionWrapper } from "@/components/transition-wrapper";
import { PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

type TimeRange = "1h" | "4h" | "24h" | "7d" | "30d";

interface DashboardContentProps {
  initialRange: TimeRange;
  hours: number;
  children: React.ReactNode;
}

export function DashboardContent({ 
  initialRange, 
  hours, 
  children 
}: DashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [currentRange, setCurrentRange] = useState<TimeRange>(initialRange);

  const handleRangeChange = (range: TimeRange) => {
    if (range === currentRange) return;
    
    setCurrentRange(range);
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("range", range);
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  const timeFilter = (
    <div className={`flex items-center gap-1 p-1 rounded-lg border transition-all duration-300 ${
      isPending 
        ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
        : 'border-[var(--border)] bg-[var(--surface)]'
    }`}>
      {(["1h", "4h", "24h", "7d", "30d"] as TimeRange[]).map((range) => {
        const labels = { "1h": "1 Hour", "4h": "4 Hours", "24h": "24 Hours", "7d": "7 Days", "30d": "30 Days" };
        return (
          <button
            key={range}
            onClick={() => handleRangeChange(range)}
            disabled={isPending}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${
              currentRange === range
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            } ${isPending && currentRange !== range ? 'opacity-40' : ''}`}
          >
            {isPending && currentRange === range && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
            {labels[range]}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description={`A summary of your monitoring workspace • Past ${
          {"1h": "1 Hour", "4h": "4 Hours", "24h": "24 Hours", "7d": "7 Days", "30d": "30 Days"}[currentRange]
        }`}
        actions={
          <div className="flex items-center gap-2">
            {timeFilter}
            <Link href="/dashboard/add">
              <Button size="sm">
                <ArrowUpRight className="w-3.5 h-3.5" />
                New monitor
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4 px-1">
        <span className={`w-2 h-2 rounded-full ${isPending ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--accent)]'}`} />
        {isPending ? 'Updating data...' : `Showing data for the past ${hours} hours`}
      </div>

      <TransitionWrapper isLoading={isPending}>
        {children}
      </TransitionWrapper>
    </>
  );
}