import { prisma } from "./prisma";
import { fanOutEvent } from "./webhooks";
import { isInMaintenanceWindow } from "./maintenance";

// Industry-standard escalation intervals (in minutes)
export const ESCALATION_INTERVALS = [
  { value: 5, label: "5 minutes", description: "Critical - Immediate response" },
  { value: 10, label: "10 minutes", description: "High priority" },
  { value: 15, label: "15 minutes", description: "Standard urgent" },
  { value: 30, label: "30 minutes", description: "Standard escalation" },
  { value: 45, label: "45 minutes", description: "Extended monitoring" },
  { value: 60, label: "1 hour", description: "Hourly review" },
  { value: 120, label: "2 hours", description: "Shift handoff" },
  { value: 240, label: "4 hours", description: "Half-day review" },
  { value: 480, label: "8 hours", description: "Business day" },
  { value: 720, label: "12 hours", description: "Overnight shift" },
  { value: 1440, label: "24 hours", description: "Daily digest" },
] as const;

export type EscalationStep = {
  waitMinutes: number;
  channel: "webhook" | "email" | "sms";
  target: string;
  messageTemplate?: string;
};

export async function processEscalations(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skippedPaused: number;
  skippedMaintenance: number;
}> {
  const now = new Date();
  console.log(`[Escalation] Starting check at ${now.toISOString()}`);
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skippedPaused = 0;
  let skippedMaintenance = 0;

  // Find open incidents but exclude paused monitors at DB level
  const openIncidents = await prisma.incident.findMany({
    where: {
      resolvedAt: null,
      monitor: {
        isPaused: false, // Exclude paused monitors
      },
    },
    include: {
      monitor: {
        select: {
          id: true,
          userId: true,
          name: true,
          target: true,
          type: true,
          isPaused: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    take: 100,
  });

  console.log(`[Escalation] Found ${openIncidents.length} open incidents (excluding paused monitors)`);

  for (const incident of openIncidents) {
    processed++;
    
    // Double-check paused (defensive)
    if (incident.monitor.isPaused) {
      skippedPaused++;
      continue;
    }

    // Check if monitor is in maintenance window
    const inMaintenance = await isInMaintenanceWindow(
      incident.monitor.id, 
      incident.monitor.userId
    );
    
    if (inMaintenance) {
      skippedMaintenance++;
      console.log(`[Escalation] Skipping incident ${incident.id} - monitor in maintenance window`);
      continue;
    }
    
    // Find applicable policy for this monitor
    const policy = await findApplicablePolicy(incident.monitor.userId, incident.monitor.id);
    if (!policy) continue;

    const steps: EscalationStep[] = policy.steps as any;
    if (!steps || steps.length === 0) continue;

    // Check each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const escalationTime = new Date(incident.startedAt.getTime() + step.waitMinutes * 60 * 1000);
      
      // Skip if not time yet
      if (now < escalationTime) continue;

      // Check if already sent
      const existing = await prisma.escalationEvent.findFirst({
        where: {
          incidentId: incident.id,
          policyId: policy.id,
          stepIndex: i,
        },
      });

      if (existing) continue; // Already processed this step

      try {
        // Send notification based on channel
        if (step.channel === "webhook") {
          await sendWebhookEscalation(incident, step, i);
        }
        // Future: else if (step.channel === "email") await sendEmailEscalation(...)
        
        await prisma.escalationEvent.create({
          data: {
            incidentId: incident.id,
            policyId: policy.id,
            stepIndex: i,
            channel: step.channel,
            target: step.target,
            status: "sent",
            sentAt: new Date(),
          },
        });
        sent++;
      } catch (error) {
        await prisma.escalationEvent.create({
          data: {
            incidentId: incident.id,
            policyId: policy.id,
            stepIndex: i,
            channel: step.channel,
            target: step.target,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          },
        });
        failed++;
      }
    }
  }
   console.log(`[Escalation] Completed: ${processed} processed, ${sent} sent, ${failed} failed, ${skippedPaused} skipped (paused), ${skippedMaintenance} skipped (maintenance)`);
  
   return { processed, sent, failed, skippedPaused, skippedMaintenance };
}

async function findApplicablePolicy(userId: string, monitorId: string) {
  // 1. Look for specific policy for this monitor
  const specificPolicy = await prisma.escalationPolicy.findFirst({
    where: {
      userId,
      monitorIds: { has: monitorId },
    },
  });
  
  if (specificPolicy) return specificPolicy;

  // 2. Look for default policy (applies to all)
  const defaultPolicy = await prisma.escalationPolicy.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });
  
  return defaultPolicy;
}

async function sendWebhookEscalation(
  incident: any,
  step: EscalationStep,
  stepIndex: number
) {
  // Interpolate template variables
  const message = step.messageTemplate 
    ? step.messageTemplate
        .replace(/{{monitor\.name}}/g, incident.monitor.name)
        .replace(/{{monitor\.target}}/g, incident.monitor.target)
        .replace(/{{monitor\.type}}/g, incident.monitor.type)
        .replace(/{{waitMinutes}}/g, String(step.waitMinutes))
        .replace(/{{incident\.cause}}/g, incident.cause || "Unknown")
        .replace(/{{incident\.id}}/g, incident.id)
    : `Escalation Step ${stepIndex + 1}: Monitor ${incident.monitor.name} has been down for ${step.waitMinutes} minutes.`;

  const payload = {
    event: "escalation.triggered",
    timestamp: new Date().toISOString(),
    step: stepIndex + 1,
    escalation: {
      waitMinutes: step.waitMinutes,
      channel: step.channel,
      target: step.target,
    },
    incident: {
      id: incident.id,
      startedAt: incident.startedAt.toISOString(),
      cause: incident.cause,
    },
    monitor: {
      id: incident.monitor.id,
      name: incident.monitor.name,
      target: incident.monitor.target,
      type: incident.monitor.type,
    },
    message,
  };

  const response = await fetch(step.target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Latency-Escalation": "true",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
  }
}