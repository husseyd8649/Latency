// components/monitor-form.tsx
"use client";

import { useActionState, useState } from "react";
import { Globe, Network, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { createMonitor } from "@/app/dashboard/monitors/actions";

type MonitorType = "HTTP" | "TCP" | "SSL";

const tabs: { key: MonitorType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { key: "HTTP", label: "HTTP", icon: Globe, desc: "URL endpoint check" },
  { key: "TCP", label: "TCP", icon: Network, desc: "Host and port reachability" },
  { key: "SSL", label: "SSL", icon: ShieldCheck, desc: "Certificate expiry monitoring" },
];

const initialState = {} as { error?: string; fieldErrors?: Record<string, string> };

export function MonitorForm() {
  const [type, setType] = useState<MonitorType>("HTTP");
  const [state, formAction, pending] = useActionState(createMonitor, initialState);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <div className="animate-fade-up">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = type === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setType(tab.key)}
              className={cn(
                "flex-1 rounded-lg border p-4 text-left transition-all",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-sm)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={cn(
                    "w-4 h-4",
                    active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-[var(--text)]" : "text-[var(--text-muted)]"
                  )}
                >
                  {tab.label}
                </span>
              </div>
              <div className="text-xs text-[var(--text-subtle)]">{tab.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="type" value={type} />

        {/* Name */}
        <Field label="Name" error={err("name")}>
          <input
            name="name"
            required
            placeholder="Production API"
            className={inputCls(!!err("name"))}
          />
        </Field>

        {/* Target — dynamic by type */}
        {type === "HTTP" && (
          <>
            <Field
              label="URL"
              hint="Full URL including protocol"
              error={err("target")}
            >
              <input
                name="target"
                required
                type="url"
                placeholder="https://api.example.com/health"
                className={inputCls(!!err("target"))}
              />
            </Field>
            <Field label="Expected status" hint="HTTP status code that means healthy" error={err("expectedStatus")}>
              <input
                name="expectedStatus"
                type="number"
                min={100}
                max={599}
                defaultValue={200}
                className={inputCls(!!err("expectedStatus"))}
              />
            </Field>
          </>
        )}

        {type === "TCP" && (
          <Field
            label="Host and port"
            hint='Format: "host:port"'
            error={err("target")}
          >
            <input
              name="target"
              required
              placeholder="db.example.com:5432"
              className={inputCls(!!err("target"))}
            />
          </Field>
        )}

        {type === "SSL" && (
          <Field
            label="Hostname"
            hint="Just the hostname, no protocol or port"
            error={err("target")}
          >
            <input
              name="target"
              required
              placeholder="example.com"
              className={inputCls(!!err("target"))}
            />
          </Field>
        )}

        {/* Interval + timeout */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Interval (seconds)" hint="How often to check" error={err("intervalSeconds")}>
            <input
              name="intervalSeconds"
              type="number"
              min={60}
              max={86400}
              defaultValue={300}
              className={inputCls(!!err("intervalSeconds"))}
            />
          </Field>
          <Field label="Timeout (ms)" hint="Fail after this duration" error={err("timeoutMs")}>
            <input
              name="timeoutMs"
              type="number"
              min={1000}
              max={60000}
              defaultValue={10000}
              className={inputCls(!!err("timeoutMs"))}
            />
          </Field>
        </div>

        {/* Global error */}
        {state.error && (
          <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
            {state.error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create monitor"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-[var(--text)]">{label}</span>
        {hint && !error && (
          <span className="text-[10px] text-[var(--text-subtle)]">{hint}</span>
        )}
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
    "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm font-mono text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors",
    hasError
      ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
      : "border-[var(--border)] focus:border-[var(--accent)]"
  );
}