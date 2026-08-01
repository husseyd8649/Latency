// app/dashboard/architecture/page.tsx
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Badge,
} from "@/components/ui/primitives";
import {
  Layers,
  Database,
  ShieldCheck,
  Cloud,
  Zap,
  Cpu,
  Webhook,
  Rocket,
} from "lucide-react";

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        title="Architecture"
        description="How Latency is built."
      />

      {/* Stack */}
      <Card className="mb-6 animate-fade-up">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--accent)]" />
            <div className="text-sm font-medium text-[var(--text)]">Stack</div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StackItem label="Framework" value="Next.js 16 (App Router)" />
            <StackItem label="Runtime" value="React 19 + Node.js" />
            <StackItem label="Database" value="PostgreSQL" />
            <StackItem label="ORM" value="Prisma 6" />
            <StackItem label="Auth" value="Auth.js v5 (JWT)" />
            <StackItem label="Email" value="Resend" />
            <StackItem label="Charts" value="Recharts" />
            <StackItem label="Styling" value="Tailwind CSS v4" />
            <StackItem label="Icons" value="Lucide" />
            <StackItem label="Hosting" value="Render" />
            <StackItem label="Scheduler" value="cron-job.org" />
            <StackItem label="Validation" value="Zod" />
          </div>
        </CardBody>
      </Card>

      {/* How checks run */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "60ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--accent)]" />
            <div className="text-sm font-medium text-[var(--text)]">How checks run</div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <FlowStep n={1} title="Scheduler" desc="cron-job.org triggers every minute" />
            <FlowStep n={2} title="API" desc="POST /api/cron/run-checks (Bearer auth)" />
            <FlowStep n={3} title="Runner" desc="HTTP / TCP / SSL, 10 in parallel" />
            <FlowStep n={4} title="Persist" desc="Check row + incident state machine" />
          </div>
          <pre className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md p-4 text-[11px] font-mono text-[var(--text)] overflow-x-auto leading-relaxed">
{`// Simplified runner loop
for (const monitor of dueMonitors) {
  const result = await runCheck(monitor);   // HTTP | TCP | SSL
  await tx.check.create({ data: result });
  await tx.monitor.update({ nextCheckAt });
  if (transitionedToDown)  await tx.incident.create(...);
  if (transitionedToUp)    await tx.incident.update({ resolvedAt });
}`}
          </pre>
        </CardBody>
      </Card>

      {/* Webhooks */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "120ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-[var(--accent)]" />
            <div className="text-sm font-medium text-[var(--text)]">
              Webhook signatures
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-xs text-[var(--text-muted)] mb-3">
            Every delivery is HMAC-SHA256 signed. Headers sent:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <HeaderRow name="X-Latency-Event" example="incident.started" />
            <HeaderRow name="X-Latency-Signature" example="sha256=abc123…" />
            <HeaderRow name="X-Latency-Delivery" example="uuid v4" />
            <HeaderRow name="Content-Type" example="application/json" />
          </div>
          <pre className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md p-4 text-[11px] font-mono text-[var(--text)] overflow-x-auto leading-relaxed">
{`{
  "event": "incident.started",
  "deliveredAt": "2025-01-15T12:34:56Z",
  "monitor": {
    "id": "clx…",
    "name": "Production API",
    "type": "HTTP",
    "target": "https://api.example.com"
  },
  "incident": {
    "id": "clx…",
    "startedAt": "2025-01-15T12:34:52Z",
    "resolvedAt": null,
    "cause": "Expected 200, got 502"
  }
}`}
          </pre>
        </CardBody>
      </Card>

      {/* Data model */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "180ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--accent)]" />
            <div className="text-sm font-medium text-[var(--text)]">Data model</div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ModelCard name="User" fields={["id", "email", "passwordHash", "name", "createdAt"]} />
            <ModelCard name="Monitor" fields={["id", "userId", "name", "type", "target", "intervalSeconds", "isPaused", "nextCheckAt"]} />
            <ModelCard name="Check" fields={["id", "monitorId", "status", "responseTimeMs", "statusCode", "error", "checkedAt"]} />
            <ModelCard name="Incident" fields={["id", "monitorId", "startedAt", "resolvedAt", "cause"]} />
            <ModelCard name="StatusPage" fields={["id", "userId", "slug", "title", "monitorIds[]"]} />
            <ModelCard name="Webhook" fields={["id", "userId", "url", "secret", "events[]", "isActive"]} />
          </div>
        </CardBody>
      </Card>

      {/* Security */}
      <Card className="mb-6 animate-fade-up" style={{ animationDelay: "240ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
            <div className="text-sm font-medium text-[var(--text)]">Security</div>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="text-xs text-[var(--text-muted)] space-y-2 leading-relaxed">
            <li>• Passwords hashed with bcrypt (cost 10). Plaintext never stored.</li>
            <li>• Sessions issued as signed JWTs via Auth.js.</li>
            <li>• Cron endpoint protected by <code className="font-mono text-[var(--accent)]">Authorization: Bearer &lt;CRON_SECRET&gt;</code>.</li>
            <li>• Webhook payloads HMAC-SHA256 signed with per-webhook secrets.</li>
            <li>• All monitor / status-page / webhook mutations scoped to <code className="font-mono">userId</code>.</li>
            <li>• Public status pages expose only selected monitors, no internal fields.</li>
          </ul>
        </CardBody>
      </Card>

      {/* Deployment */}
      <Card className="animate-fade-up" style={{ animationDelay: "300ms" } as React.CSSProperties}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[var(--accent)]" />
            <div className="text-sm font-medium text-[var(--text)]">Deployment</div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DeployStep icon={Rocket} title="Render Web" desc="Next.js app, single service, autoscale off (free tier)" />
            <DeployStep icon={Database} title="Render Postgres" desc="Managed Postgres, connection pooled via Prisma" />
            <DeployStep icon={Cpu} title="cron-job.org" desc="Hits /api/cron/run-checks every minute" />
          </div>
        </CardBody>
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function StackItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
        {label}
      </div>
      <div className="text-xs font-mono text-[var(--text)] mt-1">{value}</div>
    </div>
  );
}

function FlowStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center font-semibold">
          {n}
        </div>
        <div className="text-xs font-medium text-[var(--text)]">{title}</div>
      </div>
      <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
    </div>
  );
}

function HeaderRow({ name, example }: { name: string; example: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-2.5">
      <div className="text-[10px] font-mono text-[var(--accent)]">{name}</div>
      <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
        {example}
      </div>
    </div>
  );
}

function ModelCard({ name, fields }: { name: string; fields: string[] }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="text-xs font-semibold text-[var(--text)] mb-2">{name}</div>
      <div className="flex flex-wrap gap-1">
        {fields.map((f) => (
          <span
            key={f}
            className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] rounded px-1.5 py-0.5"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeployStep({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
        <div className="text-xs font-medium text-[var(--text)]">{title}</div>
      </div>
      <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
    </div>
  );
}