// components/import-csv-form.tsx
"use client";

import { useActionState, useState } from "react";
import { Upload, Loader2, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { importDomainsCsv } from "@/app/dashboard/add/import-actions";
import Link from "next/link";

const initial = {} as
  | { ok?: false; error?: string }
  | {
      ok: true;
      result: {
        imported: number;
        skippedDuplicate: number;
        invalid: { line: number; value: string; reason: string }[];
        total: number;
        intervalSeconds: number;
      };
    };

export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState(importDomainsCsv, initial);
  const [fileName, setFileName] = useState<string | null>(null);

  if (state && "ok" in state && state.ok) {
    const r = state.result;
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="rounded-lg border border-[var(--op-up)]/25 bg-[var(--up-soft)] p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[var(--op-up)]/15 text-[var(--op-up)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[var(--text)]">
              Import complete
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {r.imported} monitor{r.imported === 1 ? "" : "s"} created ·{" "}
              {r.skippedDuplicate} skipped as duplicate ·{" "}
              {r.invalid.length} invalid · {r.total} total rows ·{" "}
              interval {formatInterval(r.intervalSeconds)}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/dashboard/monitors">
                <Button size="sm">View monitors</Button>
              </Link>
              <Link href="/dashboard/add">
                <Button size="sm" variant="secondary">
                  Import another file
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {r.invalid.length > 0 && (
          <div className="rounded-lg border border-[var(--op-degraded)]/25 bg-[var(--degraded-soft)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-[var(--op-degraded)]" />
              <div className="text-sm font-medium text-[var(--text)]">
                {r.invalid.length} invalid row{r.invalid.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--text-subtle)] border-b border-[var(--border)]">
                    <th className="py-1.5 pr-3">Line</th>
                    <th className="py-1.5 pr-3">Value</th>
                    <th className="py-1.5">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {r.invalid.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-[var(--text-muted)]">
                        {row.line}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[var(--text)] truncate max-w-[200px]" title={row.value}>
                        {row.value}
                      </td>
                      <td className="py-1.5 text-[var(--text-muted)]">
                        {row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-[var(--text)] mb-2">
          CSV file
        </label>
        <label
          htmlFor="csv-file"
          className="flex items-center justify-center gap-3 w-full h-32 rounded-lg border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg)] hover:bg-[var(--accent-soft)] cursor-pointer transition-colors"
        >
          {fileName ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text)]">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-mono">{fileName}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
              <Upload className="w-5 h-5" />
              <div className="text-xs">Click to upload or drop a .csv file</div>
              <div className="text-[10px] text-[var(--text-subtle)]">
                One domain per line. Max 1000 rows, 2 MB.
              </div>
            </div>
          )}
          <input
            id="csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="hidden"
          />
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
          Check interval (seconds)
        </label>
        <select
          name="intervalSeconds"
          defaultValue={300}
          className="w-full h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] transition-colors"
        >
          <option value={60}>Every 1 minute (aggressive)</option>
          <option value={300}>Every 5 minutes (default)</option>
          <option value={600}>Every 10 minutes (recommended for 500+)</option>
          <option value={900}>Every 15 minutes (conservative)</option>
          <option value={3600}>Every 1 hour</option>
        </select>
        <div className="text-[10px] text-[var(--text-subtle)] mt-1">
          Applied to every imported monitor. Change per-monitor after import if needed.
        </div>
      </div>

      {state && "ok" in state && state.ok === false && state.error && (
        <div className="rounded-md border border-[var(--op-down)]/30 bg-[var(--down-soft)] px-3 py-2 text-xs text-[var(--op-down)]">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-[10px] text-[var(--text-subtle)]">
          <Badge variant="neutral">HTTPS</Badge>{" "}
          <span className="ml-2">
            Each domain becomes an HTTP monitor with expected status 200.
          </span>
        </div>
        <Button type="submit" disabled={pending || !fileName}>
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              Import
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function formatInterval(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}