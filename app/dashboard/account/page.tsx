// app/dashboard/account/page.tsx
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardBody,
  CardHeader,
  Badge,
  PageHeader,
} from "@/components/ui/primitives";
import { Mail, Calendar, KeyRound, User as UserIcon } from "lucide-react";
import { NameForm, DeleteAccountForm, PasswordForm } from "@/components/account-form";


export default async function AccountPage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      createdAt: true,
      _count: {
        select: {
          monitors: true,
          statusPages: true,
          webhooks: true,
        },
      },
    },
  });

  if (!user) {
    // Extremely rare edge case: session valid but user row missing.
    return (
      <>
        <PageHeader title="Account" />
        <Card>
          <CardBody className="text-sm text-[var(--op-down)]">
            User record not found.
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Account"
        description="Manage your profile and workspace."
      />

      {/* Header card with avatar */}
      <Card className="mb-6 animate-fade-up">
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-white text-xl font-semibold shadow-[var(--shadow-sm)]">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-[var(--text)] truncate">
                {user.name ?? "Unnamed"}
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] truncate">
                {user.email}
              </div>
            </div>
            <Badge variant="accent">Free plan</Badge>
          </div>

          <div className="mt-5 pt-5 border-t border-[var(--border)] grid grid-cols-3 gap-4">
            <Stat label="Monitors" value={user._count.monitors} />
            <Stat label="Status pages" value={user._count.statusPages} />
            <Stat label="Webhooks" value={user._count.webhooks} />
          </div>
        </CardBody>
      </Card>

      {/* Profile details */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "60ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="text-sm font-medium text-[var(--text)]">Profile</div>
        </CardHeader>
        <CardBody className="space-y-5">
          <NameForm defaultName={user.name ?? ""} />

          <div className="border-t border-[var(--border)] pt-5 grid gap-3">
            <ReadOnlyRow icon={Mail} label="Email" value={user.email} mono />
            <ReadOnlyRow
              icon={KeyRound}
              label="Sign-in method"
              value="Magic link via email"
            />
            <ReadOnlyRow
              icon={Calendar}
              label="Member since"
              value={formatDate(user.createdAt)}
            />
            <ReadOnlyRow
              icon={UserIcon}
              label="User ID"
              value={user.id}
              mono
            />
          </div>
        </CardBody>
      </Card>

            {/* Password */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "90ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[var(--text)]">
              {user.passwordHash ? "Change password" : "Set a password"}
            </div>
            {!user.passwordHash && (
              <Badge variant="accent">Recommended</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {!user.passwordHash && (
            <div className="text-xs text-[var(--text-muted)] mb-4">
              You currently sign in with magic links. Set a password to enable
              email + password sign-in as well.
            </div>
          )}
          <PasswordForm hasPassword={!!user.passwordHash} />
        </CardBody>
      </Card>

      {/* Danger zone */}
      <Card className="animate-fade-up border-[var(--op-down)]/25" style={{ animationDelay: "120ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="text-sm font-medium text-[var(--op-down)]">
            Danger zone
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-4">
            <div className="text-sm text-[var(--text)] font-medium">
              Delete account
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Permanently removes your account and all monitors, incidents,
              status pages and webhooks. This cannot be undone.
            </div>
          </div>
          <DeleteAccountForm />
        </CardBody>
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
        {label}
      </div>
      <div className="font-mono text-lg font-semibold text-[var(--text)] mt-0.5">
        {value}
      </div>
    </div>
  );
}

function ReadOnlyRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
          {label}
        </div>
        <div
          className={`text-sm text-[var(--text)] truncate ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}