"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Card, CardBody, Badge } from "@/components/ui/primitives";
import { EditRegionModal } from "@/components/edit-region-modal";
import { deleteRegion } from "@/app/dashboard/regions/actions";
import { Trash2, Edit3, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RegionWithCount = {
  id: string;
  name: string;
  slug: string;
  color: string;
  _count: { monitors: number };
};

const deleteInitial = {} as { error?: string; ok?: boolean };

export function RegionCard({ region }: { region: RegionWithCount }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRegion,
    deleteInitial
  );

  return (
    <>
      <Card className="group relative">
        <CardBody className="space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: region.color }}
              />
              <h3 className="text-sm font-semibold text-[var(--text)] leading-tight">
                {region.name}
              </h3>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                aria-label={`Edit ${region.name}`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={region.id} />
                <button
                  type="submit"
                  disabled={deletePending}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                  aria-label={`Delete ${region.name}`}
                >
                  {deletePending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Monitor className="w-3.5 h-3.5" />
              {region._count.monitors} monitor{region._count.monitors !== 1 && "s"}
            </div>
            <Badge variant="neutral">
              {region.slug}
            </Badge>
          </div>

          {/* Delete error */}
          {deleteState.error && (
            <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
              {deleteState.error}
            </div>
          )}
        </CardBody>
      </Card>

      <EditRegionModal
        region={region}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}