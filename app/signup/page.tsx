// app/signup/page.tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { signup } from "./actions";
import { cn } from "@/lib/utils";

const initialState = {} as { error?: string; fieldErrors?: Record<string, string> };

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg)]">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <Link href="/" className="relative flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight">Latency</span>
      </Link>

      <div className="relative w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-8 animate-fade-up">
        <h1 className="text-xl font-semibold mb-1">Create your account</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Start monitoring in under a minute.
        </p>

        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Name" hint="Optional" error={err("name")}>
            <input
              name="name"
              type="text"
              placeholder="Your name"
              className={inputCls(!!err("name"))}
            />
          </Field>

          <Field label="Email" error={err("email")}>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className={inputCls(!!err("email"))}
            />
          </Field>

          <Field label="Password" hint="Min 8 chars, one letter, one number" error={err("password")}>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className={inputCls(!!err("password"))}
            />
          </Field>

          <Field label="Confirm password" error={err("confirmPassword")}>
            <input
              name="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              className={inputCls(!!err("confirmPassword"))}
            />
          </Field>

          {state.error && (
            <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
              {state.error}
            </div>
          )}

          <Button type="submit" className="h-10 mt-1" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-[var(--text-subtle)] mt-6 text-center">
          Already have an account?{" "}
          <Link href="/signin" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
            Sign in
          </Link>
        </p>
      </div>
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
    "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors",
    hasError
      ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
      : "border-[var(--border)] focus:border-[var(--accent)]"
  );
}