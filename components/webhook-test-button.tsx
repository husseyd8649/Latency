// components/webhook-test-button.tsx
"use client";

import { useActionState } from "react";
import { Loader2, Send, Check, X } from "lucide-react";
import { testWebhook } from "@/app/dashboard/webhooks/actions";

const initialState = {} as { ok?: boolean; status?: number; error?: string };

export function WebhookTestButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(testWebhook, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
        title="Send a test payload"
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
        Test
      </button>
      {state.ok && (
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--op-up)]">
          <Check className="w-3 h-3" />
          {state.status ?? "OK"}
        </span>
      )}
      {state.ok === false && (
        <span
          className="inline-flex items-center gap-1 text-[10px] text-[var(--op-down)] max-w-[180px] truncate"
          title={state.error ?? String(state.status)}
        >
          <X className="w-3 h-3 shrink-0" />
          {state.status ? `HTTP ${state.status}` : state.error ?? "Failed"}
        </span>
      )}
    </form>
  );
}