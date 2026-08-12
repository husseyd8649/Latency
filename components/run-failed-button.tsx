"use client";

import { useState, useTransition } from "react";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { runFailedMonitors } from "@/app/dashboard/monitors/actions";
import { cn } from "@/lib/utils";

export function RunFailedButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ queued: number } | null>(null);

  const handleClick = () => {
    if (
      !confirm(
        'Re-run all monitors whose active incident cause contains "fetch failed"?'
      )
    )
      return;

    startTransition(async () => {
      try {
        const r = await runFailedMonitors();
        setResult(r);
        setTimeout(() => setResult(null), 4000);
      } catch (err) {
        alert(
          `Run failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[10px] font-medium",
        "press disabled:opacity-50 disabled:pointer-events-none",
        result
          ? "border-[var(--op-up)]/40 bg-[var(--up-soft)] text-[var(--op-up)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/30"
      )}
      title='Re-run monitors whose active incident cause contains "fetch failed"'
    >
      {pending ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Running…
        </>
      ) : result ? (
        <>
          <CheckCircle2 className="w-3 h-3" />
          {result.queued} queued
        </>
      ) : (
        <>
          <Zap className="w-3 h-3" />
          Run failed
        </>
      )}
    </button>
  );
}