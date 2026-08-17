import { prisma } from "./prisma";
import { fanOutEvent } from "./webhooks";
import { isInMaintenanceWindow } from "./maintenance";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        isPaused: false,
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

      if (existing) continue;

      try {
        // Send notification based on channel
        if (step.channel === "webhook") {
          await sendWebhookEscalation(incident, step, i);
        } else if (step.channel === "email") {
          await sendEmailEscalation(incident, step, i);
        }
        
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
        console.error(`[Escalation] Failed to send ${step.channel}:`, error);
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
  const specificPolicy = await prisma.escalationPolicy.findFirst({
    where: {
      userId,
      monitorIds: { has: monitorId },
    },
  });
  
  if (specificPolicy) return specificPolicy;

  const defaultPolicy = await prisma.escalationPolicy.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });
  
  return defaultPolicy;
}

function interpolateMessage(
  template: string | undefined,
  incident: any,
  step: EscalationStep,
  stepIndex: number
): string {
  if (!template) {
    return `Escalation Step ${stepIndex + 1}: Monitor ${incident.monitor.name} has been down for ${step.waitMinutes} minutes.`;
  }
  
  return template
    .replace(/{{monitor\.name}}/g, incident.monitor.name)
    .replace(/{{monitor\.target}}/g, incident.monitor.target)
    .replace(/{{monitor\.type}}/g, incident.monitor.type)
    .replace(/{{waitMinutes}}/g, String(step.waitMinutes))
    .replace(/{{incident\.cause}}/g, incident.cause || "Unknown")
    .replace(/{{incident\.id}}/g, incident.id);
}

async function sendWebhookEscalation(
  incident: any,
  step: EscalationStep,
  stepIndex: number
) {
  const message = interpolateMessage(step.messageTemplate, incident, step, stepIndex);

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

async function sendEmailEscalation(
  incident: any,
  step: EscalationStep,
  stepIndex: number
) {
  const message = interpolateMessage(step.messageTemplate, incident, step, stepIndex);
  
  const { data, error } = await resend.emails.send({
    from: "Latency Alerts <onboarding@resend.dev>",
    to: step.target,
    subject: `🚨 ESCALATION: ${incident.monitor.name} DOWN for ${step.waitMinutes} minutes`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">ESCALATION ALERT</h1>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Step ${stepIndex + 1} • ${step.waitMinutes} minutes elapsed</p>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">${incident.monitor.name}</h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px; font-family: monospace;">${incident.monitor.target}</p>
          </div>

          <div style="display: grid; gap: 12px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
              <span style="color: #991b1b; font-weight: 600;">Status</span>
              <span style="color: #dc2626; font-weight: 700;">DOWN</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: #f3f4f6; border-radius: 6px;">
              <span style="color: #374151;">Duration</span>
              <span style="color: #111827; font-weight: 600;">${step.waitMinutes} minutes</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: #f3f4f6; border-radius: 6px;">
              <span style="color: #374151;">Type</span>
              <span style="color: #111827; font-weight: 600;">${incident.monitor.type}</span>
            </div>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">${message}</p>
          </div>

          <div style="text-align: center;">
            <a href="https://latency-4hkf.onrender.com/dashboard/incidents" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View in Dashboard
            </a>
          </div>
        </div>

        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
          Sent by Latency Signal Ops Platform
        </p>
      </div>
    `,
    text: `ESCALATION ALERT - Step ${stepIndex + 1}

Monitor: ${incident.monitor.name}
Target: ${incident.monitor.target}
Status: DOWN for ${step.waitMinutes} minutes
Type: ${incident.monitor.type}

${message}

View dashboard: https://latency-4hkf.onrender.com/dashboard/incidents
`,
  });

  if (error) {
    throw new Error(`Email failed: ${error.message}`);
  }

  console.log(`[Escalation] Email sent to ${step.target}, id: ${data?.id}`);
}