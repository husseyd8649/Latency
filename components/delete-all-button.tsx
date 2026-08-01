// components/delete-all-button.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { deleteAllMonitors } from "@/app/dashboard/monitors/actions";
import { cn } from "@/lib/utils";

const CONFIRM_PHRASE = "delete all";

export function DeleteAllButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const canDelete = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;
  const disabled = count === 0;

  // Portal target only exists after mount (avoids SSR mismatch)
  useEffect(() => setMounted(true), []);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setError(null);
    }
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, pending]);

  // Lock body scroll while modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleConfirm = () => {
    if (!canDelete) return;
    startTransition(async () => {
      try {
        await deleteAllMonitors();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  };

  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className="relative w-full max-w-md rounded-xl border border-[var(--op-down)]/30 bg-[var(--surface)] shadow-[var(--shadow-md)] p-6 animate-fade-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-all-title"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--down-soft)] text-[var(--op-down)] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="delete-all-title"
              className="text-base font-semibold text-[var(--text)]"
            >
              Delete all monitors?
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              This will permanently delete <strong>{count}</strong>{" "}
              monitor{count === 1 ? "" : "s"}, all their check history, and
              associated incidents. Status pages will remain but will show no
              monitors.
            </p>
            <p className="text-xs text-[var(--op-down)] mt-2 font-medium">
              This cannot be undone.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
            Type{" "}
            <span className="font-mono text-[var(--op-down)]">
              {CONFIRM_PHRASE}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            disabled={pending}
            autoFocus
            className={cn(
              "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors font-mono",
              canDelete
                ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
                : "border-[var(--border)] focus:border-[var(--border-strong)]"
            )}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            disabled={!canDelete || pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Delete all
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="danger"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={
          count === 0
            ? "No monitors to delete"
            : `Delete all ${count} monitors`
        }
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete all
      </Button>

      {mounted && modal && createPortal(modal, document.body)}
    </>
  );
}
