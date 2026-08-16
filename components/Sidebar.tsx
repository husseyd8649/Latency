"use client";

import { useState, useEffect } from "react";
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
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Wrench,
  Key,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";


const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/monitors", label: "Monitors", icon: Activity },
  { href: "/dashboard/add", label: "Add", icon: PlusCircle },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/status", label: "Status", icon: Globe },
  { href: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/dashboard/regions", label: "Regions", icon: MapPin },
  { href: "/dashboard/architecture", label: "Architecture", icon: Network },
  { href: "/dashboard/account", label: "Account", icon: User },
  { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { href: "/dashboard/escalation", label: "Escalations", icon: Bell },
];

const STORAGE_KEY = "latency-sidebar-collapsed";

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  // Persist collapsed state across sessions
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "shrink-0 h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center pt-5 pb-4 transition-all duration-300",
          collapsed ? "px-3 justify-center" : "px-5 justify-between"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <div className="text-sm font-semibold tracking-tight text-[var(--text)] leading-none">
                Latency
              </div>
              <div className="text-[10px] text-[var(--text-subtle)] mt-0.5 uppercase tracking-wider">
                Signal Ops
              </div>
            </div>
          )}
        </Link>
        {!collapsed && <ThemeToggle />}
      </div>

      {/* Collapse toggle */}
      {mounted && (
        <div
          className={cn(
            "px-3 mb-1",
            collapsed ? "flex justify-center" : ""
          )}
        >
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "flex items-center gap-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-200 active:scale-95",
              collapsed
                ? "w-10 h-10 justify-center"
                : "w-full px-3 py-2 text-xs"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 shrink-0" />
                <span className="font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] animate-fade-in">
            Workspace
          </div>
        )}
        {collapsed && <div className="py-1" />}

        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center rounded-md transition-all duration-200",
                collapsed
                  ? "justify-center w-10 h-10 mx-auto"
                  : "gap-3 px-3 py-2 text-sm",
                active
                  ? "text-[var(--text)] bg-[var(--surface-2)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <span
                  className={cn(
                    "absolute left-0 w-[2px] rounded-full bg-[var(--accent)]",
                    collapsed ? "top-2 bottom-2" : "top-1.5 bottom-1.5"
                  )}
                />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="animate-fade-in">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-3">
        {/* Theme toggle in collapsed mode — single cycling icon button */}
        {collapsed && (
          <div className="flex justify-center mb-2">
            <ThemeToggle compact />
          </div>
        )}

        {userEmail && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)] shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">
              {userEmail}
            </div>
          </div>
        )}

        {userEmail && collapsed && (
          <div className="flex justify-center mb-1" title={userEmail}>
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">
              {userEmail.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <form action="/api/signout" method="post">
          <button
            type="submit"
            className={cn(
              "flex items-center rounded-md text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-all duration-200",
              collapsed
                ? "w-10 h-10 justify-center mx-auto"
                : "w-full gap-3 px-3 py-2 text-sm"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="animate-fade-in">Sign out</span>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}