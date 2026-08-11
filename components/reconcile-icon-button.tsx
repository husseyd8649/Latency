"use client";

import { useState, useTransition } from "react";
import { Loader2, Wrench, CheckCircle2 } from "lucide-react";
import { reconcileIncidents } from "@/app/dashboard/monitors/actions";
import { cn } from "@/lib/utils";

export function ReconcileIconButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    scanned: number;
    resolved: number;
  } | null>(null);

  const handleClick = () => {
    if (
      !confirm(
        "Scan open incidents and close any whose monitor is currently UP?"
      )
    )
      return;

    startTransition(async () => {
      try {
        const r = await reconcileIncidents();
        setResult(r);
        setTimeout(() => setResult(null), 4000);
      } catch (err) {
        alert(
          `Reconcile failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    });
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-md border transition-all duration-200",
          "active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          result
            ? "border-[var(--op-up)]/40 bg-[var(--up-soft)] text-[var(--op-up)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/30"
        )}
        title={
          pending
            ? "Reconciling…"
            : result
              ? `${result.resolved} closed (${result.scanned} scanned)`
              : "Reconcile — close stale incidents"
        }
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : result ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <Wrench className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Brief result tooltip that fades away */}
      {result && (
        <span className="text-[10px] text-[var(--op-up)] font-medium animate-fade-up">
          {result.resolved} closed
        </span>
      )}
    </div>
  );
}