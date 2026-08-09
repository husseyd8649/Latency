"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, PlusCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { createRegion } from "@/app/dashboard/regions/actions";
import { cn } from "@/lib/utils";

const initial = {} as {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

const presetColors = [
  "#2563EB", // blue
  "#7C3AED", // violet
  "#059669", // emerald
  "#D97706", // amber
  "#DC2626", // red
  "#0891B2", // cyan
  "#C026D3", // fuchsia
  "#4F46E5", // indigo
  "#EA580C", // orange
  "#65A30D", // lime
];

export function CreateRegionModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createRegion, initial);
  const [mounted, setMounted] = useState(false);
  const [selectedColor, setSelectedColor] = useState(presetColors[0]);

  useEffect(() => setMounted(true), []);

  // Close on success
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => {
        setOpen(false);
        setSelectedColor(presetColors[0]);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, pending]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const err = (f: string) => state.fieldErrors?.[f];

  const trigger = (
    <Button size="sm" onClick={() => setOpen(true)}>
      <PlusCircle className="w-3.5 h-3.5" />
      Add region
    </Button>
  );

  if (!open || !mounted) return trigger;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) setOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-6 animate-fade-up"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-base font-semibold text-[var(--text)]">
            Create region
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Group monitors by geographic or logical region.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Name */}
          <Field label="Name" error={err("name")}>
            <input
              name="name"
              required
              maxLength={50}
              placeholder="US East"
              className={inputCls(!!err("name"))}
            />
          </Field>

          {/* Color */}
          <Field label="Color" error={err("color")}>
            <input type="hidden" name="color" value={selectedColor} />
            <div className="space-y-3">
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      selectedColor === color
                        ? "border-[var(--text)] scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              {/* Custom hex input */}
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full border border-[var(--border)] shrink-0"
                  style={{ backgroundColor: selectedColor }}
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                      setSelectedColor(val);
                    }
                  }}
                  maxLength={7}
                  className={cn(inputCls(!!err("color")), "font-mono w-28")}
                  placeholder="#2563EB"
                />
              </div>
            </div>
          </Field>

          {/* Global error */}
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
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating…
                </>
              ) : state.ok ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Created
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create region
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {createPortal(modal, document.body)}
    </>
  );
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