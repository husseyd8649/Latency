// app/dashboard/add/import-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";

export type ImportResult = {
  imported: number;
  skippedDuplicate: number;
  invalid: { line: number; value: string; reason: string }[];
  total: number;
  intervalSeconds: number;
};

type ActionState =
  | { ok?: false; error?: string }
  | { ok: true; result: ImportResult };

const MAX_ROWS = 1000;
const HTTPS_PREFIX = "https://";

export async function importDomainsCsv(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const file = formData.get("file");
  const intervalRaw = formData.get("intervalSeconds");
  const intervalSeconds = Number(intervalRaw ?? 300);

  if (
    !Number.isFinite(intervalSeconds) ||
    intervalSeconds < 60 ||
    intervalSeconds > 86400
  ) {
    return { ok: false, error: "Interval must be between 60 and 86400 seconds." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "File is larger than 2 MB." };
  }

  const text = await file.text();

  const parsed = Papa.parse<string[]>(text.trim(), {
    skipEmptyLines: true,
  });

  const fatalErrors = parsed.errors.filter(
    (e) => e.type !== "Delimiter" && e.code !== "UndetectableDelimiter"
  );
  if (fatalErrors.length > 0) {
    return {
      ok: false,
      error: `CSV parse failed: ${fatalErrors[0].message}`,
    };
  }

  const rawDomains: { line: number; value: string }[] = [];
  parsed.data.forEach((row, idx) => {
    const cell = String(row?.[0] ?? "").trim();
    if (!cell) return;
    if (idx === 0 && /^(domain|domains|url|urls|host|hostname)$/i.test(cell)) {
      return;
    }
    rawDomains.push({ line: idx + 1, value: cell });
  });

  if (rawDomains.length === 0) {
    return { ok: false, error: "No domains found in the file." };
  }

  if (rawDomains.length > MAX_ROWS) {
    return {
      ok: false,
      error: `File has ${rawDomains.length} rows. Maximum is ${MAX_ROWS} per import.`,
    };
  }

  const valid: { line: number; url: string; name: string }[] = [];
  const invalid: ImportResult["invalid"] = [];
  const seenInBatch = new Set<string>();

  for (const { line, value } of rawDomains) {
    const normalized = normalizeToHttpsUrl(value);
    if (!normalized) {
      invalid.push({ line, value, reason: "Invalid domain or URL" });
      continue;
    }
    if (seenInBatch.has(normalized.url)) {
      invalid.push({ line, value, reason: "Duplicate within this file" });
      continue;
    }
    seenInBatch.add(normalized.url);
    valid.push({ line, url: normalized.url, name: normalized.name });
  }

  if (valid.length === 0) {
    return { ok: false, error: "No valid domains to import." };
  }

  const existing = await prisma.monitor.findMany({
    where: {
      userId: user.id,
      type: "HTTP",
      target: { in: valid.map((v) => v.url) },
    },
    select: { target: true },
  });
  const existingSet = new Set(existing.map((e) => e.target));

  const toCreate = valid.filter((v) => !existingSet.has(v.url));
  const skippedDuplicate = valid.length - toCreate.length;

  const now = new Date();
  const bucketSizeSeconds =
    toCreate.length > 0 ? intervalSeconds / toCreate.length : 0;

  await prisma.monitor.createMany({
    data: toCreate.map((v, i) => ({
      userId: user.id,
      name: v.name,
      type: "HTTP" as const,
      target: v.url,
      intervalSeconds,
      timeoutMs: 20000,
      expectedStatus: 200,
      isPaused: false,
      nextCheckAt: new Date(
        now.getTime() + Math.floor(i * bucketSizeSeconds * 1000)
      ),
    })),
    skipDuplicates: true,
  });

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");

  return {
    ok: true,
    result: {
      imported: toCreate.length,
      skippedDuplicate,
      invalid,
      total: rawDomains.length,
      intervalSeconds,
    },
  };
}

function normalizeToHttpsUrl(
  raw: string
): { url: string; name: string } | null {
  let s = raw.trim();
  if (!s) return null;

  s = s.replace(/^["']|["']$/g, "").trim();

  if (!/^https?:\/\//i.test(s)) {
    s = HTTPS_PREFIX + s;
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.protocol = "https:";

  if (
    !url.hostname ||
    !url.hostname.includes(".") ||
    /\s/.test(url.hostname)
  ) {
    return null;
  }

  const finalUrl = url.toString();
  const displayUrl =
    finalUrl.endsWith("/") && url.pathname === "/"
      ? finalUrl.slice(0, -1)
      : finalUrl;

  return {
    url: displayUrl,
    name: url.hostname,
  };
}