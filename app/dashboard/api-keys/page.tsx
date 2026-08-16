import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateApiKey, revokeApiKey } from "@/lib/api-keys";
import { revalidatePath } from "next/cache";
import { Key, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const headersList = await headers();
  const newKey = headersList.get("x-new-api-key"); // Passed after creation
  
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">API Keys</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage access for external integrations and infrastructure tools</p>
        </div>
      </div>

      {newKey && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-[var(--text)] mb-1">API Key Created</h3>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Copy this key now. You won&apos;t be able to see it again.
              </p>
              <code className="block p-3 bg-[var(--surface-2)] rounded border border-[var(--border)] font-mono text-sm break-all text-[var(--text)]">
                {newKey}
              </code>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-medium text-[var(--text)] mb-4">Create New Key</h2>
        <form action={createKey} className="flex gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Key Name</label>
            <input 
              name="name" 
              required 
              placeholder="e.g., Terraform Production"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
            />
          </div>
          <div className="w-48 space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Expires</label>
            <select 
              name="expiresInDays"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
            >
              <option value="">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
          <button 
            type="submit"
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            Generate
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
          Active Keys ({keys.length})
        </h3>
        
        {keys.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]/50">
            <Key className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--text-muted)]">No API keys</p>
          </div>
        ) : (
          keys.map(k => (
            <div key={k.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[var(--text)]">{k.name}</span>
                  {k.expiresAt && new Date() > k.expiresAt ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      Expired
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--text-muted)] space-x-3">
                  <span>Prefix: <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-xs">{k.keyPrefix}...</code></span>
                  <span>•</span>
                  <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                  {k.lastUsedAt && (
                    <>
                      <span>•</span>
                      <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                    </>
                  )}
                  {k.expiresAt && (
                    <>
                      <span>•</span>
                      <span>Expires {new Date(k.expiresAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
              
              <form action={revokeKey}>
                <input type="hidden" name="id" value={k.id} />
                <button 
                  type="submit"
                  className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Revoke key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <h3 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[var(--accent)]" />
          API Documentation
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Use your API key to access monitor data programmatically.
        </p>
        <code className="block p-3 bg-[var(--surface-2)] rounded border border-[var(--border)] font-mono text-xs text-[var(--text)]">
          GET https://latency-4hkf.onrender.com/api/v1/monitors<br/>
          Authorization: Bearer lat_live_xxxxxxxx...
        </code>
      </div>
    </div>
  );
}

async function createKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  
  const name = String(formData.get("name"));
  const expiresInDays = formData.get("expiresInDays") 
    ? parseInt(String(formData.get("expiresInDays"))) 
    : undefined;
  
  const key = await generateApiKey(user.id, name, expiresInDays);
  
  // Pass key to page via header (hack for server action to client)
  // In production, you'd use a redirect with query param or session flash
  revalidatePath("/dashboard/api-keys");
  
  // Return key in a way the page can display it (requires client component for optimal UX, but this works)
  // Actually, let's use a redirect with the key in a cookie or just accept we need a client component for the "copy" feature
  
  // For now, we'll add it to the URL temporarily (not secure but works for demo)
  // Better: Store in DB with a "show_once" flag, or use encrypted cookie
  
  // Simple approach: Redirect with hash (not sent to server logs)
  redirect(`/dashboard/api-keys#key=${encodeURIComponent(key)}`);
}

async function revokeKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  
  await revokeApiKey(user.id, id);
  revalidatePath("/dashboard/api-keys");
}