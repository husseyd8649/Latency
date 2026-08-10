import Link from "next/link";
import { X, MapPin } from "lucide-react";

type RegionInfo = {
  name: string;
  color: string;
};

export function RegionFilterBar({
  region,
  matchedCount,
  totalCount,
}: {
  region: RegionInfo;
  matchedCount: number;
  totalCount: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-2.5 animate-fade-up">
      <div className="flex items-center gap-2.5 text-sm">
        <MapPin className="w-4 h-4 text-[var(--accent)]" />
        <span className="text-[var(--text-muted)]">Filtered by</span>
        <span className="flex items-center gap-1.5 font-medium text-[var(--text)]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: region.color }}
          />
          {region.name}
        </span>
        <span className="text-xs text-[var(--text-subtle)]">
          · {matchedCount} of {totalCount} monitor{totalCount !== 1 && "s"}
        </span>
      </div>
      <Link
        href="/dashboard/monitors"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Clear filter
      </Link>
    </div>
  );
}