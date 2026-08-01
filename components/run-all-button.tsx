// components/run-all-button.tsx
"use client";

import { useState, useTransition } from "react";
import { Zap, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { runAllMonitors } from "@/app/dashboard/monitors/actions";

export function RunAllButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [scheduled, setScheduled] = useState(false);

  const disabled = pending || count === 0;

  const handleClick = () => {
    const message =
      count === 1
        ? "Re-run 1 monitor now?"
        : `Re-run all ${count} monitors on the next cron tick?`;
    if (!confirm(message)) return;

    startTransition(async () => {
      await runAllMonitors();
      setScheduled(true);
      setTimeout(() => setScheduled(false), 3000);
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={handleClick}
      disabled={disabled}
      title={
        count === 0
          ? "No monitors to run"
          : "Mark every non-paused monitor as immediately due"
      }
    >
      {pending ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Scheduling…
        </>
      ) : scheduled ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Scheduled
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5" />
          Run all
        </>
      )}
    </Button>
  );
}
