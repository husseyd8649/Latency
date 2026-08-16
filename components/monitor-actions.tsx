"use client";

import { useState } from "react";
import { 
  MoreHorizontal, 
  Shield, 
  ShieldOff, 
  Trash2, 
  Edit3, 
  Play, 
  Pause,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MonitorActionsProps {
  monitor: {
    id: string;
    name: string;
    isProtected: boolean;
    isPaused: boolean;
  };
  onDelete?: (id: string) => void;
}

export function MonitorActions({ monitor }: MonitorActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-md transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 py-1">
            {/* Edit Action */}
            <form action={`/dashboard/monitors/edit?id=${monitor.id}`} className="contents">
              <button
                type="submit"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-left"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            </form>

            {/* Pause/Resume Action */}
            <form action="/dashboard/monitors/actions" method="POST" className="contents">
              <input type="hidden" name="id" value={monitor.id} />
              <input type="hidden" name="action" value="togglePause" />
              <button
                type="submit"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-left"
              >
                {monitor.isPaused ? (
                  <>
                    <Play className="w-4 h-4 text-green-500" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 text-yellow-500" />
                    Pause
                  </>
                )}
              </button>
            </form>

            {/* Protection Toggle */}
            <form action="/dashboard/monitors/actions" method="POST" className="contents">
              <input type="hidden" name="id" value={monitor.id} />
              <input type="hidden" name="action" value="toggleProtection" />
              <input 
                type="hidden" 
                name="isProtected" 
                value={monitor.isProtected ? "false" : "true"} 
              />
              <button
                type="submit"
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left",
                  monitor.isProtected 
                    ? "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10" 
                    : "text-green-600 dark:text-green-400 hover:bg-green-500/10"
                )}
              >
                {monitor.isProtected ? (
                  <>
                    <ShieldOff className="w-4 h-4" />
                    Unprotect
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Protect
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-[var(--border)] my-1" />

            {/* Delete Action - Disabled if protected */}
            <form action="/dashboard/monitors/actions" method="POST" className="contents">
              <input type="hidden" name="id" value={monitor.id} />
              <input type="hidden" name="action" value="delete" />
              <button
                type="submit"
                disabled={monitor.isProtected}
                title={monitor.isProtected ? "Cannot delete protected monitor" : "Delete monitor"}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left",
                  monitor.isProtected
                    ? "opacity-50 cursor-not-allowed text-[var(--text-muted)]"
                    : "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                )}
              >
                <Trash2 className="w-4 h-4" />
                {monitor.isProtected ? "Protected (Can't Delete)" : "Delete"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}