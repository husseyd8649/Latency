// app/dashboard/status/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Badge,
} from "@/components/ui/primitives";
import { Globe, Trash2, ExternalLink } from "lucide-react";
import { deleteStatusPage } from "./actions";
import { StatusPageForm } from "@/components/status-page-form";
import { CopyUrlButton } from "@/components/copy-url-button";
import { headers } from "next/headers";

export default async function StatusPagesPage() {
  const user = await requireUser();

  const [pages, monitors] = await Promise.all([
    prisma.statusPage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.monitor.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Build the public URL prefix from request headers (works locally and in prod).
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <>
      <PageHeader
        title="Status pages"
        description="Public uptime pages you can share with customers."
      />

      {pages.length === 0 ? (
        <Card className="animate-fade-up mb-6">
          <CardBody className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <Globe className="w-5 h-5 text-[var(--text-subtle)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text)]">
              No status pages yet
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Create a public page to share your system status.
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 mb-8">
          {pages.map((page) => {
            const publicUrl = `${baseUrl}/s/${page.slug}`;
            return (
              <Card key={page.id} className="animate-fade-up">
                <CardBody className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text)] truncate">
                      {page.title}
                    </div>
                    <div className="text-xs font-mono text-[var(--text-muted)] mt-0.5 truncate">
                      {publicUrl}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="neutral">
                        {page.monitorIds.length} monitors
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CopyUrlButton url={publicUrl} />
                    <Link
                      href={`/s/${page.slug}`}
                      target="_blank"
                      className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <form action={deleteStatusPage}>
                      <input type="hidden" name="id" value={page.id} />
                      <button
                        type="submit"
                        className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--op-down)] hover:bg-[var(--surface-2)] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create form */}
      <Card className="animate-fade-up">
        <CardHeader>
          <div className="text-sm font-medium text-[var(--text)]">
            Create new status page
          </div>
        </CardHeader>
        <CardBody>
          <StatusPageForm monitors={monitors} />
        </CardBody>
      </Card>
    </>
  );
}