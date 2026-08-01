// components/account-form.tsx
"use client";

import { useActionState, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { updateName, deleteAccount } from "@/app/dashboard/account/actions";
import { cn } from "@/lib/utils";
import { setOrChangePassword } from "@/app/dashboard/account/actions";


const initialState = {} as { error?: string; success?: string };

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(updateName, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <div className="text-xs font-medium text-[var(--text)] mb-1.5">
          Display name
        </div>
        <input
          name="name"
          defaultValue={defaultName}
          placeholder="Your name"
          className={cn(
            "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors",
            state.error
              ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
              : "border-[var(--border)] focus:border-[var(--accent)]"
          )}
        />
      </label>

      {state.error && (
        <div className="text-xs text-[var(--op-down)]">{state.error}</div>
      )}
      {state.success && (
        <div className="inline-flex items-center gap-1.5 text-xs text-[var(--op-up)]">
          <Check className="w-3.5 h-3.5" />
          {state.success}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------- Delete -------------------------------- */

export function DeleteAccountForm() {
  const [confirm, setConfirm] = useState("");
  const canDelete = confirm.trim().toLowerCase() === "delete";

  return (
    <form action={deleteAccount} className="space-y-3">
      <div>
        <div className="text-xs font-medium text-[var(--text)] mb-1.5">
          Type <span className="font-mono text-[var(--op-down)]">delete</span> to confirm
        </div>
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="delete"
          className="w-full h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--op-down)] transition-colors font-mono"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          variant="danger"
          disabled={!canDelete}
        >
          Delete my account
        </Button>
      </div>
    </form>
  );
}

type PwState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};
const pwInitial = {} as PwState;

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState(setOrChangePassword, pwInitial);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-3">
      {hasPassword && (
        <label className="block">
          <div className="text-xs font-medium text-[var(--text)] mb-1.5">
            Current password
          </div>
          <input
            name="currentPassword"
            type="password"
            className={cn(
              "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] transition-colors",
              err("currentPassword")
                ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
                : "border-[var(--border)] focus:border-[var(--accent)]"
            )}
          />
          {err("currentPassword") && (
            <div className="text-[10px] text-[var(--op-down)] mt-1">
              {err("currentPassword")}
            </div>
          )}
        </label>
      )}

      <label className="block">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-medium text-[var(--text)]">
            New password
          </span>
          <span className="text-[10px] text-[var(--text-subtle)]">
            Min 8 chars, one letter, one number
          </span>
        </div>
        <input
          name="newPassword"
          type="password"
          required
          className={cn(
            "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] transition-colors",
            err("newPassword")
              ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
              : "border-[var(--border)] focus:border-[var(--accent)]"
          )}
        />
        {err("newPassword") && (
          <div className="text-[10px] text-[var(--op-down)] mt-1">
            {err("newPassword")}
          </div>
        )}
      </label>

      <label className="block">
        <div className="text-xs font-medium text-[var(--text)] mb-1.5">
          Confirm new password
        </div>
        <input
          name="confirmPassword"
          type="password"
          required
          className={cn(
            "w-full h-10 rounded-md border bg-[var(--bg)] px-3 text-sm text-[var(--text)] transition-colors",
            err("confirmPassword")
              ? "border-[var(--op-down)]/50 focus:border-[var(--op-down)]"
              : "border-[var(--border)] focus:border-[var(--accent)]"
          )}
        />
        {err("confirmPassword") && (
          <div className="text-[10px] text-[var(--op-down)] mt-1">
            {err("confirmPassword")}
          </div>
        )}
      </label>

      {state.error && !state.fieldErrors && (
        <div className="text-xs text-[var(--op-down)]">{state.error}</div>
      )}
      {state.success && (
        <div className="inline-flex items-center gap-1.5 text-xs text-[var(--op-up)]">
          <Check className="w-3.5 h-3.5" />
          {state.success}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : hasPassword ? (
            "Update password"
          ) : (
            "Set password"
          )}
        </Button>
      </div>
    </form>
  );
}