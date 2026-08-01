// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  PlusCircle,
  AlertTriangle,
  Globe,
  Network,
  LogOut,
  Zap,
  User,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/monitors", label: "Monitors", icon: Activity },
  { href: "/dashboard/add", label: "Add", icon: PlusCircle },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/status", label: "Status", icon: Globe },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/dashboard/architecture", label: "Architecture", icon: Network },
  { href: "/dashboard/account", label: "Account", icon: User },
];

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-[var(--shadow-sm)]">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-[var(--text)] leading-none">
              Latency
            </div>
            <div className="text-[10px] text-[var(--text-subtle)] mt-0.5 uppercase tracking-wider">
              Signal Ops
            </div>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Workspace
        </div>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
                active
                  ? "text-[var(--text)] bg-[var(--surface-2)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
              )}
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-3">
        {userEmail && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">{userEmail}</div>
          </div>
        )}
        <form action="/api/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}