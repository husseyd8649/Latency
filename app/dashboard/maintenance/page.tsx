import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Wrench, Calendar, Clock, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function MaintenancePage() {
  const user = await requireUser();
  
  const windows = await prisma.maintenanceWindow.findMany({
    where: { userId: user.id },
    orderBy: { startsAt: "desc" },
  });
  
  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const activeWindows = windows.filter(w => now >= w.startsAt && now <= w.endsAt);
  const upcomingWindows = windows.filter(w => w.startsAt > now);
  const pastWindows = windows.filter(w => w.endsAt < now);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Maintenance Windows</h1>
          <p className="text-sm text-[var(--text-muted)]">Schedule planned downtime to suppress alerts during maintenance</p>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-[var(--text)] mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--accent)]" />
          Schedule Maintenance
        </h2>
        
        <form action={createMaintenanceWindow} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Window Name</label>
              <input 
                name="name" 
                required 
                placeholder="e.g., Fiber Maintenance - Tower 4" 
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Description</label>
              <input 
                name="description" 
                placeholder="Planned infrastructure upgrade" 
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Start Time
              </label>
              <input 
                type="datetime-local" 
                name="startsAt" 
                required 
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors [color-scheme:dark]"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                End Time
              </label>
              <input 
                type="datetime-local" 
                name="endsAt" 
                required 
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Scope</label>
            <select 
              name="scope" 
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
            >
              <option value="all">All Monitors</option>
              <option value="selected">Specific Monitors</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Select Monitors</label>
            <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-md bg-[var(--surface-2)] p-2 space-y-1">
              {monitors.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] p-2">No monitors available</p>
              ) : (
                monitors.map(m => (
                  <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--surface)] cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      name="monitorIds" 
                      value={m.id} 
                      className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text)]">{m.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Only applies when &quot;Specific Monitors&quot; is selected above</p>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Schedule Window
            </button>
          </div>
        </form>
      </div>

      {/* Windows List */}
      <div className="space-y-4">
        {/* Active Windows */}
        {activeWindows.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Active Now ({activeWindows.length})
            </h3>
            {activeWindows.map(w => (
              <WindowCard key={w.id} window={w} userId={user.id} isActive />
            ))}
          </div>
        )}

        {/* Upcoming Windows */}
        {upcomingWindows.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider text-[var(--text-muted)]">
              Upcoming ({upcomingWindows.length})
            </h3>
            {upcomingWindows.map(w => (
              <WindowCard key={w.id} window={w} userId={user.id} />
            ))}
          </div>
        )}

        {/* Past Windows */}
        {pastWindows.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              History ({pastWindows.length})
            </h3>
            {pastWindows.slice(0, 5).map(w => (
              <WindowCard key={w.id} window={w} userId={user.id} isPast />
            ))}
            {pastWindows.length > 5 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">
                + {pastWindows.length - 5} more historical windows
              </p>
            )}
          </div>
        )}

        {windows.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]/50">
            <Wrench className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--text-muted)]">No maintenance windows scheduled</p>
            <p className="text-sm text-[var(--text-subtle)] mt-1">Create one above to suppress alerts during planned work</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WindowCard({ 
  window, 
  userId, 
  isActive, 
  isPast 
}: { 
  window: { 
    id: string; 
    name: string; 
    description: string | null; 
    startsAt: Date; 
    endsAt: Date; 
    monitorIds: string[] 
  }; 
  userId: string;
  isActive?: boolean;
  isPast?: boolean;
}) {
  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const duration = Math.round((window.endsAt.getTime() - window.startsAt.getTime()) / (1000 * 60));
  
  return (
    <div className={cn(
      "group relative p-4 rounded-xl border transition-all",
      isActive 
        ? "bg-yellow-500/5 border-yellow-500/20 dark:bg-yellow-500/10" 
        : isPast
        ? "bg-[var(--surface)] border-[var(--border)] opacity-60"
        : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/30"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-[var(--text)] truncate">{window.name}</h4>
            {isActive && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                Active
              </span>
            )}
          </div>
          
          {window.description && (
            <p className="text-sm text-[var(--text-muted)] mb-2">{window.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-subtle)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(window.startsAt)} → {formatDate(window.endsAt)}
            </span>
            <span className="text-[var(--border)]">•</span>
            <span>{duration} minutes</span>
            <span className="text-[var(--border)]">•</span>
            <span className="flex items-center gap-1.5">
              {window.monitorIds.length === 0 ? (
                <>All monitors</>
              ) : (
                <>{window.monitorIds.length} monitors</>
              )}
            </span>
          </div>
        </div>

        {!isPast && (
          <form action={deleteMaintenanceWindow}>
            <input type="hidden" name="id" value={window.id} />
            <button 
              type="submit" 
              className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Cancel maintenance window"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

async function createMaintenanceWindow(formData: FormData) {
  "use server";
  const user = await requireUser();
  
  const name = String(formData.get("name"));
  const description = String(formData.get("description") || "");
  const startsAt = new Date(String(formData.get("startsAt")));
  const endsAt = new Date(String(formData.get("endsAt")));
  const scope = String(formData.get("scope"));
  
  if (endsAt <= startsAt) {
    throw new Error("End time must be after start time");
  }
  
  const monitorIds = scope === "all" 
    ? [] 
    : formData.getAll("monitorIds").map(String);

  await prisma.maintenanceWindow.create({
    data: {
      userId: user.id,
      name,
      description,
      startsAt,
      endsAt,
      monitorIds,
    },
  });
  
  revalidatePath("/dashboard/maintenance");
  redirect("/dashboard/maintenance");
}

async function deleteMaintenanceWindow(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  
  await prisma.maintenanceWindow.deleteMany({
    where: { id, userId: user.id },
  });
  
  revalidatePath("/dashboard/maintenance");
}