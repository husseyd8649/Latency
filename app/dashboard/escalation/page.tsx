import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Bell, Plus, Trash2, Clock, AlertTriangle, CheckCircle2, Webhook, Mail, MessageSquare, ChevronRight, Shield } from "lucide-react";
import { ESCALATION_INTERVALS } from "@/lib/escalation";
import { cn } from "@/lib/utils";

export default async function EscalationPage() {
  const user = await requireUser();
  
  const policies = await prisma.escalationPolicy.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  
  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, lastStatus: true },
    orderBy: { name: "asc" },
  });

  const activePolicies = policies.filter(p => {
    const steps = (p.steps as any[]) || [];
    return steps.length > 0;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Escalation Policies</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Tiered incident response when monitors stay down
          </p>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-[var(--text)] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent)]" />
          Create Policy
        </h2>
        
        <form action={createPolicy} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Policy Name</label>
              <input 
                name="name" 
                required 
                placeholder="e.g., Critical Infrastructure"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Description</label>
              <input 
                name="description" 
                placeholder="PagerDuty → Manager → Director"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          {/* Default Toggle */}
          <div className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
            <input 
              type="checkbox" 
              name="isDefault" 
              id="isDefault"
              className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <div className="flex-1">
              <label htmlFor="isDefault" className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--accent)]" />
                Apply to all monitors by default
              </label>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Automatically applies to new and existing monitors unless overridden
              </p>
            </div>
          </div>

          {/* Monitor Selection (if not default) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Specific Monitors</label>
            <p className="text-xs text-[var(--text-muted)] mb-2">Only applies when not set as default</p>
            <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-md bg-[var(--surface-2)] p-2 space-y-1">
              {monitors.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] p-2">No monitors available</p>
              ) : (
                monitors.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-[var(--surface)] cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      name="monitorIds" 
                      value={m.id} 
                      className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-[var(--text)]">{m.name}</span>
                      {m.lastStatus === "UP" ? (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="UP" />
                      ) : m.lastStatus === "DOWN" ? (
                        <span className="w-2 h-2 rounded-full bg-red-500" title="DOWN" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-400" title="Unknown" />
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Steps Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text)]">Escalation Steps</label>
              <span className="text-xs text-[var(--text-muted)]">Up to 3 tiers</span>
            </div>
            
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="relative p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors group">
                  {/* Step Number */}
                  <div className="absolute -top-3 left-4 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--accent)]">
                    Tier {index + 1}
                  </div>

                  <div className="pt-2 grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Interval */}
                    <div className="md:col-span-4">
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Wait Time
                      </label>
                      <select 
                        name={`step_${index}_waitMinutes`}
                        className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                      >
                        <option value="">Select interval...</option>
                        {ESCALATION_INTERVALS.map(interval => (
                          <option key={interval.value} value={interval.value}>
                            {interval.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                        {ESCALATION_INTERVALS[0]?.description}
                      </p>
                    </div>

                    {/* Channel */}
                    <div className="md:col-span-3">
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5">Channel</label>
                      <select 
                        name={`step_${index}_channel`}
                        className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                      >
                        <option value="webhook">
                          Webhook
                        </option>
                        <option value="email" disabled className="text-[var(--text-muted)]">
                          Email (soon)
                        </option>
                        <option value="sms" disabled className="text-[var(--text-muted)]">
                          SMS (soon)
                        </option>
                      </select>
                      <div className="flex items-center gap-1 mt-1">
                        <Webhook className="w-3 h-3 text-[var(--text-subtle)]" />
                        <span className="text-[10px] text-[var(--text-subtle)]">HTTP POST</span>
                      </div>
                    </div>

                    {/* Target */}
                    <div className="md:col-span-5">
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5">Target URL</label>
                      <input 
                        type="url"
                        name={`step_${index}_target`}
                        placeholder="https://hooks.slack.com/..."
                        className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {/* Message Template */}
                  <div className="mt-3">
                    <label className="text-xs text-[var(--text-muted)] block mb-1.5">Custom Message (optional)</label>
                    <input 
                      type="text"
                      name={`step_${index}_message`}
                      placeholder="CRITICAL: {{monitor.name}} has been down for {{waitMinutes}} minutes!"
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                    />
                    <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                      Use {"{{monitor.name}}"}, {"{{waitMinutes}}"}, {"{{incident.cause}}"} as variables
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Create Escalation Policy
            </button>
          </div>
        </form>
      </div>

      {/* Active Policies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
            Active Policies ({activePolicies.length})
          </h3>
        </div>
        
        {policies.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]/50">
            <Bell className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--text-muted)] font-medium">No escalation policies</p>
            <p className="text-sm text-[var(--text-subtle)] mt-1">Create one above to enable tiered incident response</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {policies.map(policy => {
              const steps = (policy.steps as any[]) || [];
              const isActive = steps.length > 0;
              
              return (
                <div key={policy.id} className={cn(
                  "group relative p-5 bg-[var(--surface)] border rounded-xl transition-all",
                  isActive ? "border-[var(--border)] hover:border-[var(--accent)]/30" : "border-[var(--border)] opacity-60"
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-[var(--text)] truncate">{policy.name}</h4>
                        {policy.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                            Default
                          </span>
                        )}
                        {!isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                            No Steps
                          </span>
                        )}
                      </div>
                      
                      {policy.description && (
                        <p className="text-sm text-[var(--text-muted)] mb-3">{policy.description}</p>
                      )}
                      
                      {steps.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {steps.map((step: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--accent)]">
                                {idx + 1}
                              </div>
                              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                              <span className="text-[var(--text)] font-medium min-w-[80px]">
                                {ESCALATION_INTERVALS.find(i => i.value === step.waitMinutes)?.label || `${step.waitMinutes}m`}
                              </span>
                              <ChevronRight className="w-4 h-4 text-[var(--border)]" />
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                                {step.channel === 'webhook' && <Webhook className="w-3.5 h-3.5 text-[var(--text-subtle)]" />}
                                {step.channel === 'email' && <Mail className="w-3.5 h-3.5 text-[var(--text-subtle)]" />}
                                {step.channel === 'sms' && <MessageSquare className="w-3.5 h-3.5 text-[var(--text-subtle)]" />}
                                <span className="text-xs text-[var(--text-subtle)] uppercase">{step.channel}</span>
                              </div>
                              <code className="text-xs text-[var(--text-muted)] truncate max-w-[200px] hidden sm:block">
                                {step.target}
                              </code>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          {policy.monitorIds.length === 0 ? (
                            policy.isDefault ? "All monitors" : "No monitors assigned"
                          ) : (
                            `${policy.monitorIds.length} monitors`
                          )}
                        </span>
                        <span>•</span>
                        <span>Created {new Date(policy.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <form action={deletePolicy} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <input type="hidden" name="id" value={policy.id} />
                      <button 
                        type="submit"
                        className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete policy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <h3 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--accent)]" />
          How Escalations Work
        </h3>
        <ul className="text-sm text-[var(--text-muted)] space-y-1.5 list-disc list-inside">
          <li>Escalation cron runs every 5 minutes to check open incidents</li>
          <li>Each step waits the specified time before firing (e.g., 15 minutes)</li>
          <li>Paused monitors and maintenance windows are automatically excluded</li>
          <li>Only the first matching policy applies to each monitor</li>
          <li>Use webhook.site for testing your endpoints before adding real URLs</li>
        </ul>
      </div>
    </div>
  );
}

async function createPolicy(formData: FormData) {
  "use server";
  const user = await requireUser();
  
  const name = String(formData.get("name"));
  const description = String(formData.get("description") || "");
  const isDefault = formData.get("isDefault") === "on";
  const monitorIds = formData.getAll("monitorIds").map(String);
  
  // Parse steps
  const steps = [];
  for (let i = 0; i < 3; i++) {
    const waitMinutes = formData.get(`step_${i}_waitMinutes`);
    const channel = formData.get(`step_${i}_channel`);
    const target = formData.get(`step_${i}_target`);
    const message = formData.get(`step_${i}_message`);
    
    if (waitMinutes && channel && target) {
      steps.push({
        waitMinutes: parseInt(String(waitMinutes)),
        channel: String(channel),
        target: String(target),
        messageTemplate: message ? String(message) : undefined,
      });
    }
  }

  await prisma.escalationPolicy.create({
    data: {
      userId: user.id,
      name,
      description,
      isDefault,
      steps: steps as any,
      monitorIds,
    },
  });
  
  revalidatePath("/dashboard/escalation");
  redirect("/dashboard/escalation");
}

async function deletePolicy(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  
  await prisma.escalationPolicy.deleteMany({
    where: { id, userId: user.id },
  });
  
  revalidatePath("/dashboard/escalation");
}