import Link from "next/link";
import { Card, CardBody, Badge, StatusDot } from "@/components/ui/primitives";
import { ArrowRight } from "lucide-react";

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
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
          Regional Health
        </h2>
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

  const filterHref = region.id
    ? `/dashboard/monitors?region=${region.slug}`
    : `/dashboard/monitors?region=ungrouped`;

  return (
    <Card className="hover:border-[var(--border-strong)] transition-colors">
      <CardBody className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: region.color }}
            />
            <span className="text-sm font-semibold text-[var(--text)]">
              {region.name}
            </span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {total} monitor{total !== 1 && "s"}
          </span>
        </div>

        {/* Status bar */}
        {total > 0 ? (
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-[var(--surface-2)]">
              {region.up > 0 && (
                <div
                  className="h-full bg-[var(--op-up)]"
                  style={{ width: `${upPct}%` }}
                  title={`${region.up} up`}
                />
              )}
              {region.down > 0 && (
                <div
                  className="h-full bg-[var(--op-down)]"
                  style={{ width: `${downPct}%` }}
                  title={`${region.down} down`}
                />
              )}
              {region.paused > 0 && (
                <div
                  className="h-full bg-[var(--text-subtle)]"
                  style={{ width: `${pausedPct}%` }}
                  title={`${region.paused} paused`}
                />
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              {region.up > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--op-up)]" />
                  {region.up} up
                </span>
              )}
              {region.down > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--op-down)]" />
                  {region.down} down
                </span>
              )}
              {region.paused > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)]" />
                  {region.paused} paused
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-subtle)]">No monitors</div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {region.activeIncidents > 0 ? (
            <Badge variant="down">
              {region.activeIncidents} incident{region.activeIncidents !== 1 && "s"}
            </Badge>
          ) : (
            <Badge variant="up">All clear</Badge>
          )}
          <Link
            href={filterHref}
            className="inline-flex items-center gap-1 text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}