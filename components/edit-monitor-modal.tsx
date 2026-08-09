"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { editMonitor } from "@/app/dashboard/monitors/actions";
import { cn } from "@/lib/utils";

const initial = {} as {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export type EditableMonitor = {
  id: string;
  name: string;
  type: "HTTP" | "TCP" | "SSL";
  target: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number | null;
  regionId: string | null;
};

type Region = {
  id: string;
  name: string;
  color: string;
};

export function EditMonitorModal({
  monitor,
  open,
  onClose,
  regions = [],
}: {
  monitor: EditableMonitor;
  open: boolean;
  onClose: () => void;
  regions?: Region[];
}) {
  const [state, formAction, pending] = useActionState(editMonitor, initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on save success
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => onClose(), 500);
      return () => clearTimeout(t);
    }
  }, [state.ok, onClose]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, pending, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const err = (f: string) => state.fieldErrors?.[f];

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-6 animate-fade-up"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-base font-semibold text-[var(--text)]">
            Edit monitor
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            <span className="font-mono text-[var(--accent)]">{monitor.type}</span>{" "}
            monitor. Type cannot be changed.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={monitor.id} />

          <Field label="Name" error={err("name")}>
            <input
              name="name"
              required
              defaultValue={monitor.name}
              maxLength={80}
              className={inputCls(!!err("name"))}
            />
          </Field>

          <Field
            label={
              monitor.type === "HTTP"
                ? "URL"
                : monitor.type === "TCP"
                ? "Host:port"
                : "Hostname"
            }
            error={err("target")}
          >
            <input
              name="target"
              required
              defaultValue={monitor.target}
              maxLength={500}
              className={cn(inputCls(!!err("target")), "font-mono")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Interval (seconds)" error={err("intervalSeconds")}>
              <input
                name="intervalSeconds"
                type="number"
                min={60}
                max={86400}
                defaultValue={monitor.intervalSeconds}
                className={inputCls(!!err("intervalSeconds"))}
              />
            </Field>
            <Field label="Timeout (ms)" error={err("timeoutMs")}>
              <input
                name="timeoutMs"
                type="number"
                min={1000}
                max={60000}
                defaultValue={monitor.timeoutMs}
                className={inputCls(!!err("timeoutMs"))}
              />
            </Field>
          </div>

          {monitor.type === "HTTP" && (
            <Field label="Expected status" error={err("expectedStatus")}>
              <input
                name="expectedStatus"
                type="number"
                min={100}
                max={599}
                defaultValue={monitor.expectedStatus ?? 200}
                className={inputCls(!!err("expectedStatus"))}
              />
            </Field>
          )}

          {/* Region */}
          <Field label="Region" error={err("regionId")}>
            <select
              name="regionId"
              defaultValue={monitor.regionId ?? ""}
              className={selectCls(!!err("regionId"))}
            >
              <option value="">No region (ungrouped)</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          {state.error && !state.fieldErrors && (
            <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving…
                </>
              ) : state.ok ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-[var(--text)]">{label}</span>
        {error && (
          <span className="text-[10px] text-[var(--op-down)]">{error}</span>
        )}
      </div>
      {children}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors",
    hasError
      ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
      : "border-[var(--border)] focus:border-[var(--accent)]"
  );
}

function selectCls(hasError: boolean) {
  return cn(
    "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] transition-colors appearance-none",
    "bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat",
    "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
    hasError
      ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
      : "border-[var(--border)] focus:border-[var(--accent)]"
  );
}