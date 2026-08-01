// app/dashboard/webhooks/page.tsx
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Badge,
} from "@/components/ui/primitives";
import { Webhook as WebhookIcon, Trash2, Power, PowerOff } from "lucide-react";
import { deleteWebhook, toggleWebhook } from "./actions";
import { WebhookForm } from "@/components/webhook-form";
import { WebhookTestButton } from "@/components/webhook-test-button";
import { maskSecret } from "@/lib/webhooks";

export default async function WebhooksPage() {
  const user = await requireUser();

  const webhooks = await prisma.webhook.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Get notified when monitors change state."
      />

      {/* Existing webhooks */}
      {webhooks.length === 0 ? (
        <Card className="animate-fade-up mb-6">
          <CardBody className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <WebhookIcon className="w-5 h-5 text-[var(--text-subtle)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text)]">
              No webhooks yet
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Create one below to receive HMAC-signed HTTP callbacks.
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3 mb-8">
          {webhooks.map((w) => (
            <Card key={w.id} className="animate-fade-up">
              <CardBody>
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      w.isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "bg-[var(--surface-2)] text-[var(--text-subtle)]"
                    }`}
                  >
                    <WebhookIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-[var(--text)] truncate" title={w.url}>
                      {w.url}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-subtle)] mt-1 truncate">
                      secret: {maskSecret(w.secret)}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {w.events.map((e) => (
                        <Badge key={e} variant="neutral">
                          <span className="font-mono">{e}</span>
                        </Badge>
                      ))}
                      <Badge variant={w.isActive ? "up" : "neutral"}>
                        {w.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <WebhookTestButton id={w.id} />
                    <form action={toggleWebhook}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                        title={w.isActive ? "Pause" : "Resume"}
                      >
                        {w.isActive ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                    </form>
                    <form action={deleteWebhook}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <Card className="animate-fade-up mb-8">
        <CardHeader>
          <div className="text-sm font-medium text-[var(--text)]">
            Add webhook
          </div>
        </CardHeader>
        <CardBody>
          <WebhookForm />
        </CardBody>
      </Card>

      {/* HMAC verification snippet */}
      <Card className="animate-fade-up">
        <CardHeader>
          <div className="text-sm font-medium text-[var(--text)]">
            Verifying signatures
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-xs text-[var(--text-muted)] mb-3">
            Every payload is signed with your secret using HMAC-SHA256.
            The signature is sent in the <code className="font-mono text-[var(--accent)]">X-Latency-Signature</code> header
            as <code className="font-mono text-[var(--accent)]">sha256=&lt;hex&gt;</code>.
          </div>
          <pre className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md p-4 text-[11px] font-mono text-[var(--text)] overflow-x-auto leading-relaxed">
{`// Node.js verification example
import crypto from "node:crypto";

function verifySignature(secret, rawBody, header) {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}`}
          </pre>
          <div className="text-[10px] text-[var(--text-subtle)] mt-3">
            Use the <strong>raw request body</strong> (not the parsed JSON) when computing the HMAC.
            Reject payloads with a <code className="font-mono">deliveredAt</code> older than 5 minutes.
          </div>
        </CardBody>
      </Card>
    </>
  );
}