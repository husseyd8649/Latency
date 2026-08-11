import Link from "next/link";
import { Card, CardBody } from "@/components/ui/primitives";
import { ArrowRight, MapPin, Activity, AlertCircle } from "lucide-react";

type RegionHealthData = {
  id: string | null;
  name: string;
  slug: string;
  color: string;
  total: number;
  up: number;
  down: number;
  paused: number;
  activeIncidents: number;
};

export function RegionalHealth({ regions }: { regions: RegionHealthData[] }) {
  if (regions.length === 0) return null;

  return (
    <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
      <div className="mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)] leading-tight">
            Regional Health
          </h2>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            Grouped monitor status
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((r) => (
          <RegionHealthCard key={r.slug} region={r} />
        ))}
      </div>
    </div>
  );
}

function RegionHealthCard({ region }: { region: RegionHealthData }) {
  const total = region.total;
  const upPct = total > 0 ? (region.up / total) * 100 : 0;
  const downPct = total > 0 ? (region.down / total) * 100 : 0;
  const pausedPct = total > 0 ? (region.paused / total) * 100 : 0;

  const healthPct = total > 0 ? Math.round((region.up / total) * 100) : 0;
  const hasIncidents = region.activeIncidents > 0;

  const filterHref = region.id
    ? `/dashboard/monitors?region=${region.slug}`
    : `/dashboard/monitors?region=ungrouped`;

  const statusTone = hasIncidents
    ? "text-[var(--op-down)]"
    : total === 0
    ? "text-[var(--text-muted)]"
    : "text-[var(--op-up)]";

  return (
    <Card className="group relative overflow-hidden hover:border-[var(--border-strong)] transition-all hover:shadow-[var(--shadow-md)]">
      {/* Accent stripe on left edge, colored by region */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: region.color }}
      />

      <CardBody className="pl-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[var(--text)] truncate">
              {region.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Activity className="w-3 h-3" />
              <span>
                {total} monitor{total !== 1 && "s"}
              </span>
            </div>
          </div>

          {/* Big health % badge */}
          {total > 0 && (
            <div className={`text-right ${statusTone}`}>
              <div className="font-mono text-xl font-bold leading-none">
                {healthPct}%
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                Healthy
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        {total > 0 ? (
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-[var(--surface-2)]">
              {region.up > 0 && (
                <div
                  className="h-full bg-[var(--op-up)] transition-all"
                  style={{ width: `${upPct}%` }}
                  title={`${region.up} up`}
                />
              )}
              {region.down > 0 && (
                <div
                  className="h-full bg-[var(--op-down)] transition-all"
                  style={{ width: `${downPct}%` }}
                  title={`${region.down} down`}
                />
              )}
              {region.paused > 0 && (
                <div
                  className="h-full bg-[var(--text-subtle)] transition-all"
                  style={{ width: `${pausedPct}%` }}
                  title={`${region.paused} paused`}
                />
              )}
            </div>
            {/* Legend chips */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
              {region.up > 0 && (
                <span className="flex items-center gap-1 text-[var(--op-up)] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--op-up)]" />
                  {region.up} up
                </span>
              )}
              {region.down > 0 && (
                <span className="flex items-center gap-1 text-[var(--op-down)] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--op-down)]" />
                  {region.down} down
                </span>
              )}
              {region.paused > 0 && (
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)]" />
                  {region.paused} paused
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-subtle)] italic">
            No monitors assigned
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            {hasIncidents ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-[var(--op-down)]" />
                <span className="text-xs font-medium text-[var(--op-down)]">
                  {region.activeIncidents} incident
                  {region.activeIncidents !== 1 && "s"}
                </span>
              </>
            ) : total > 0 ? (
              <span className="text-xs font-medium text-[var(--op-up)]">
                ✓ All clear
              </span>
            ) : (
              <span className="text-xs text-[var(--text-subtle)]">—</span>
            )}
          </div>
          <Link
            href={filterHref}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors group-hover:translate-x-0.5 duration-200"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}