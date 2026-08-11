// components/theme-toggle.tsx
"use client";

import { Building2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const options = [
  { key: "corporate", label: "Corporate", Icon: Building2 },
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "corporate" : "corporate";

  /* -------- Compact mode: single button that cycles through themes -------- */
  if (compact) {
    const currentIndex = options.findIndex((o) => o.key === current);
    const activeOption = options[currentIndex >= 0 ? currentIndex : 0];
    const nextOption =
      options[(currentIndex >= 0 ? currentIndex + 1 : 1) % options.length];
    const Icon = activeOption.Icon;

    return (
      <button
        type="button"
        aria-label={`Theme: ${activeOption.label}. Click to switch to ${nextOption.label}.`}
        title={`${activeOption.label} — click for ${nextOption.label}`}
        onClick={() => setTheme(nextOption.key)}
        className={cn(
          "inline-flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 active:scale-90",
          "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--surface-2)]"
        )}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  /* -------- Default mode: full three-button segmented control -------- */
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)]"
    >
      {options.map(({ key, label, Icon }) => {
        const active = current === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(key)}
            className={cn(
              "inline-flex items-center justify-center w-7 h-7 rounded-[5px] transition-colors",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}