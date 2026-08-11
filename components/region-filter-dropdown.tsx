"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MapPin, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Region = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export function RegionFilterDropdown({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get("region") ?? null;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const activeRegion = activeSlug
    ? activeSlug === "ungrouped"
      ? { name: "Ungrouped", color: "var(--text-subtle)", slug: "ungrouped" }
      : regions.find(
          (r) => r.slug.toLowerCase() === activeSlug.toLowerCase()
        ) ?? null
    : null;

  // Position the portal panel below the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function navigate(slug: string | null) {
    setOpen(false);
    if (slug) {
      router.push(`/dashboard/monitors?region=${slug}`);
    } else {
      router.push("/dashboard/monitors");
    }
  }

  const options: { slug: string | null; name: string; color: string }[] = [
    { slug: null, name: "All Regions", color: "var(--accent)" },
    ...regions.map((r) => ({ slug: r.slug, name: r.name, color: r.color })),
    { slug: "ungrouped", name: "Ungrouped", color: "var(--text-subtle)" },
  ];

  return (
    <div className="relative inline-flex">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 h-8 px-3 rounded-md border text-xs font-medium transition-all duration-150",
          activeRegion
            ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
        )}
      >
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        {activeRegion ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeRegion.color }}
            />
            {activeRegion.name}
          </span>
        ) : (
          "Region"
        )}
        <ChevronDown
          className={cn(
            "w-3 h-3 shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Clear button */}
      {activeRegion && (
        <button
          type="button"
          onClick={() => navigate(null)}
          className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-colors"
          title="Clear filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Portalled dropdown */}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden animate-fade-up"
            style={{
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                Filter by region
              </div>
            </div>

            {/* Options */}
            <div className="py-1 max-h-[280px] overflow-y-auto">
              {options.map((opt) => {
                const isActive =
                  opt.slug === null
                    ? activeSlug === null
                    : opt.slug.toLowerCase() ===
                      (activeSlug ?? "").toLowerCase();

                return (
                  <button
                    key={opt.slug ?? "__all__"}
                    type="button"
                    onClick={() => navigate(opt.slug)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors",
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span className="flex-1 font-medium truncate">
                      {opt.name}
                    </span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}