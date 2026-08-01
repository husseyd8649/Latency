// components/status-page-form.tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { createStatusPage } from "@/app/dashboard/status/actions";
import { cn } from "@/lib/utils";

type Monitor = { id: string; name: string; type: "HTTP" | "TCP" | "SSL" };

const initialState = {} as { error?: string; fieldErrors?: Record<string, string> };

export function StatusPageForm({ monitors }: { monitors: Monitor[] }) {
  const [state, formAction, pending] = useActionState(createStatusPage, initialState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
            Page title
          </label>
          <input
            name="title"
            required
            placeholder="Acme API Status"
            className={inputCls(!!err("title"))}
          />
          {err("title") && (
            <div className="text-[10px] text-[var(--op-down)] mt-1">{err("title")}</div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
            Slug <span className="text-[var(--text-subtle)]">(URL path)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-subtle)] font-mono">/s/</span>
            <input
              name="slug"
              required
              placeholder="acme-status"
              className={cn(inputCls(!!err("slug")), "flex-1 font-mono")}
            />
          </div>
          {err("slug") ? (
            <div className="text-[10px] text-[var(--op-down)] mt-1">{err("slug")}</div>
          ) : (
            <div className="text-[10px] text-[var(--text-subtle)] mt-1">
              Letters, numbers, hyphens. Start with a letter.
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text)] mb-2">
          Select monitors to include
        </label>
        {monitors.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-md p-4 text-center">
            You have no monitors yet.{" "}
            <Link href="/dashboard/add" className="text-[var(--accent)] hover:underline">
              Add one first
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {monitors.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 p-3 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  name="monitorIds"
                  value={m.id}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text)] truncate">{m.name}</div>
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">
                    {m.type}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
        {err("monitorIds") && (
          <div className="text-[10px] text-[var(--op-down)] mt-1">{err("monitorIds")}</div>
        )}
      </div>

      {state.error && !state.fieldErrors && (
        <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
          {state.error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={monitors.length === 0 || pending}>
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" />
              Create status page
            </>
          )}
        </Button>
      </div>
    </form>
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