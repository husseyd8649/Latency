// components/webhook-form.tsx
"use client";

import { useActionState, useState } from "react";
import { Copy, Check, Loader2, PlusCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { createWebhook } from "@/app/dashboard/webhooks/actions";
import { cn } from "@/lib/utils";

const initialState = {} as {
  error?: string;
  fieldErrors?: Record<string, string>;
  createdSecret?: string;
  createdId?: string;
};

export function WebhookForm() {
  const [state, formAction, pending] = useActionState(createWebhook, initialState);
  const err = (f: string) => state.fieldErrors?.[f];

  if (state.createdSecret) {
    return <SecretRevealCard secret={state.createdSecret} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
          Endpoint URL
        </label>
        <input
          name="url"
          required
          type="url"
          placeholder="https://your-app.com/webhooks/latency"
          className={inputCls(!!err("url"))}
        />
        {err("url") && (
          <div className="text-[10px] text-[var(--op-down)] mt-1">{err("url")}</div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text)] mb-2">
          Events
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <EventCheckbox
            value="incident.started"
            title="incident.started"
            desc="A monitor went from UP to DOWN"
          />
          <EventCheckbox
            value="incident.resolved"
            title="incident.resolved"
            desc="A monitor recovered from DOWN to UP"
          />
        </div>
        {err("events") && (
          <div className="text-[10px] text-[var(--op-down)] mt-1">{err("events")}</div>
        )}
      </div>

      {state.error && !state.fieldErrors && (
        <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
          {state.error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" />
              Create webhook
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

function EventCheckbox({
  value,
  title,
  desc,
}: {
  value: string;
  title: string;
  desc: string;
}) {
  return (
    <label className="flex items-start gap-2 p-3 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors">
      <input
        type="checkbox"
        name="events"
        value={value}
        defaultChecked
        className="mt-0.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-[var(--text)]">{title}</div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</div>
      </div>
    </label>
  );
}

function SecretRevealCard({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this secret:", secret);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--op-degraded)]/30 bg-[var(--degraded-soft)] p-5 animate-fade-up">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-md bg-[var(--op-degraded)]/15 text-[var(--op-degraded)] flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            Save this secret now
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            You&apos;ll never see it again. Use it to verify HMAC signatures on your endpoint.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 font-mono text-xs text-[var(--text)] break-all">
        <div className="flex-1 min-w-0 break-all">{secret}</div>
        <button
          type="button"
          onClick={copy}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors shrink-0"
          title="Copy secret"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[var(--op-up)]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <a
          href="/dashboard/webhooks"
          className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium"
        >
          Done — I&apos;ve saved it →
        </a>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors font-mono",
    hasError
      ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
      : "border-[var(--border)] focus:border-[var(--accent)]"
  );
}