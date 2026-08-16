import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Bell, Plus, Trash2, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ESCALATION_INTERVALS } from "@/lib/escalation";

export default async function EscalationPage() {
  const user = await requireUser();
  
  const policies = await prisma.escalationPolicy.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  
  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Escalation Policies</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Define who gets notified and when if incidents aren't resolved
          </p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-medium text-[var(--text)] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent)]" />
          Create Escalation Policy
        </h2>
        
        <form action={createPolicy} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Policy Name</label>
            <input 
              name="name" 
              required 
              placeholder="e.g., Critical Infrastructure - Tier 1"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Description</label>
            <input 
              name="description" 
              placeholder="PagerDuty integration for production monitors"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              name="isDefault" 
              id="isDefault"
              className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
            />
            <label htmlFor="isDefault" className="text-sm text-[var(--text)]">
              Apply to all monitors by default
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Applies to Specific Monitors (if not default)</label>
            <div className="max-h-32 overflow-y-auto border border-[var(--border)] rounded-md bg-[var(--surface-2)] p-2 space-y-1">
              {monitors.map(m => (
                <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--surface)] cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="monitorIds" 
                    value={m.id} 
                    className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--text)]">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Steps */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--text)]">Escalation Steps</label>
            <p className="text-xs text-[var(--text-muted)]">
              Define notification sequence. Each step waits the specified time before triggering if the incident is still open.
            </p>
            
            {[0, 1, 2].map((index) => (
              <div key={index} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  Step {index + 1}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Wait Time</label>
                    <select 
                      name={`step_${index}_waitMinutes`}
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm"
                    >
                      <option value="">Select interval...</option>
                      {ESCALATION_INTERVALS.map(interval => (
                        <option key={interval.value} value={interval.value}>
                          {interval.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Channel</label>
                    <select 
                      name={`step_${index}_channel`}
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm"
                    >
                      <option value="webhook">Webhook</option>
                      <option value="email" disabled>Email (coming soon)</option>
                      <option value="sms" disabled>SMS (coming soon)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Target URL</label>
                    <input 
                      type="url"
                      name={`step_${index}_target`}
                      placeholder="https://hooks.slack.com/..."
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Custom Message (optional)</label>
                  <input 
                    type="text"
                    name={`step_${index}_message`}
                    placeholder="CRITICAL: {{monitor.name}} has been down for {{waitMinutes}} minutes!"
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] text-sm placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity font-medium text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Create Policy
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
          Active Policies ({policies.length})
        </h3>
        
        {policies.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]/50">
            <Bell className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--text-muted)]">No escalation policies configured</p>
          </div>
        ) : (
          policies.map(policy => {
            const steps = (policy.steps as any[]) || [];
            return (
              <div key={policy.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-[var(--text)]">{policy.name}</h4>
                      {policy.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                          Default
                        </span>
                      )}
                    </div>
                    {policy.description && (
                      <p className="text-sm text-[var(--text-muted)]">{policy.description}</p>
                    )}
                  </div>
                  <form action={deletePolicy}>
                    <input type="hidden" name="id" value={policy.id} />
                    <button 
                      type="submit"
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
                
                <div className="space-y-2">
                  {steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-[var(--text)] font-medium">
                        {ESCALATION_INTERVALS.find(i => i.value === step.waitMinutes)?.label || `${step.waitMinutes} min`}
                      </span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="text-[var(--text-subtle)] uppercase text-xs">{step.channel}</span>
                      <code className="text-xs bg-[var(--surface-2)] px-2 py-1 rounded text-[var(--text-muted)] truncate max-w-xs">
                        {step.target}
                      </code>
                    </div>
                  ))}
                  {steps.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)] italic">No steps configured</p>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                  {policy.monitorIds.length === 0 ? (
                    policy.isDefault ? "Applies to all monitors" : "No monitors assigned"
                  ) : (
                    `Applies to ${policy.monitorIds.length} specific monitors`
                  )}
                </div>
              </div>
            );
          })
        )}
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