// app/signin/page.tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { signInWithPassword, signInWithMagicLink } from "./actions";
import { cn } from "@/lib/utils";

const initialState = {} as { error?: string };

export default function SignInPage() {
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initialState);
  const [mlState, mlAction, mlPending] = useActionState(signInWithMagicLink, initialState);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg)]">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <Link href="/" className="relative flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight">Latency</span>
      </Link>

      <div className="relative w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-8 animate-fade-up">
        <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Sign in to your workspace.
        </p>

        {/* Password form */}
        <form action={pwAction} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className={cn(
              "h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors",
              pwState.error
                ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
                : "border-[var(--border)] focus:border-[var(--accent)]"
            )}
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className={cn(
              "h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors",
              pwState.error
                ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
                : "border-[var(--border)] focus:border-[var(--accent)]"
            )}
          />
          {pwState.error && (
            <div className="text-xs text-[var(--op-down)]">{pwState.error}</div>
          )}
          <Button type="submit" className="h-10" disabled={pwPending}>
            {pwPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
            or
          </span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Magic link */}
        <form action={mlAction} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email for magic link"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] transition-colors"
          />
          {mlState.error && (
            <div className="text-xs text-[var(--op-down)]">{mlState.error}</div>
          )}
          <Button type="submit" variant="secondary" className="h-10" disabled={mlPending}>
            {mlPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                Email me a magic link
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-[var(--text-subtle)] mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
