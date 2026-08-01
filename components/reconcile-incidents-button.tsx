// components/reconcile-incidents-button.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { reconcileIncidents } from "@/app/dashboard/monitors/actions";

export function ReconcileIncidentsButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    scanned: number;
    resolved: number;
  } | null>(null);

  const handleClick = () => {
    if (!confirm("Scan open incidents and close any whose monitor is currently UP?"))
      return;

    startTransition(async () => {
      try {
        const r = await reconcileIncidents();
        setResult(r);
        setTimeout(() => setResult(null), 5000);
      } catch (err) {
        alert(`Reconcile failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleClick}
        disabled={pending}
        title="Close incidents whose monitor is currently UP"
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Reconciling…
          </>
        ) : result ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {result.resolved} closed
          </>
        ) : (
          <>
            <Wrench className="w-3.5 h-3.5" />
            Reconcile
          </>
        )}
      </Button>
      {result && (
        <span className="text-[10px] text-[var(--text-subtle)]">
          Scanned {result.scanned}
        </span>
      )}
    </div>
  );
}