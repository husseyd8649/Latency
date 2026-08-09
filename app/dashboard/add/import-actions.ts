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
  regionName: string | null;
};

type ActionState =
  | { ok?: false; error?: string }
  | { ok: true; result: ImportResult };

const MAX_ROWS = 1000;
const HTTPS_PREFIX = "https://";

const KNOWN_DOMAIN_HEADERS = /^(domain|domains|url|urls|host|hostname)$/i;
const KNOWN_REGION_HEADER = /^region$/i;

export async function importDomainsCsv(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const file = formData.get("file");
  const intervalRaw = formData.get("intervalSeconds");
  const intervalSeconds = Number(intervalRaw ?? 300);
  const defaultRegionId = (formData.get("defaultRegionId") as string) || null;

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

  // Validate defaultRegionId belongs to this user if provided
  let defaultRegion: { id: string; name: string } | null = null;
  if (defaultRegionId) {
    const found = await prisma.region.findFirst({
      where: { id: defaultRegionId, userId: user.id },
      select: { id: true, name: true },
    });
    if (!found) {
      return { ok: false, error: "Selected default region not found." };
    }
    defaultRegion = found;
  }

  // Fetch all user regions for per-row resolution by name
  const userRegions = await prisma.region.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, slug: true },
  });

  const regionByName = new Map(
    userRegions.map((r) => [r.name.toLowerCase().trim(), r])
  );
  const regionBySlug = new Map(
    userRegions.map((r) => [r.slug.toLowerCase().trim(), r])
  );

  const text = await file.text();

  // --- Detect format: headerless (legacy) vs header-based (new) ---
  const result = detectAndParse(text);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const { rawRows, hasRegionColumn } = result;

  if (rawRows.length === 0) {
    return { ok: false, error: "No domains found in the file." };
  }

  if (rawRows.length > MAX_ROWS) {
    return {
      ok: false,
      error: `File has ${rawRows.length} rows. Maximum is ${MAX_ROWS} per import.`,
    };
  }

  // If CSV has a region column, validate ALL region names before proceeding
  if (hasRegionColumn) {
    const unknownRegions: string[] = [];
    for (const row of rawRows) {
      if (!row.regionName) continue;
      const key = row.regionName.toLowerCase().trim();
      const match = regionByName.get(key) ?? regionBySlug.get(key);
      if (!match) {
        unknownRegions.push(row.regionName);
      }
    }
    if (unknownRegions.length > 0) {
      const unique = Array.from(new Set(unknownRegions));
      return {
        ok: false,
        error: `Unknown region${unique.length > 1 ? "s" : ""} in CSV: ${unique.map((n) => `"${n}"`).join(", ")}. Create ${unique.length > 1 ? "these regions" : "this region"} first, then re-import.`,
      };
    }
  }

  const valid: {
    line: number;
    url: string;
    name: string;
    regionId: string | null;
  }[] = [];
  const invalid: ImportResult["invalid"] = [];
  const seenInBatch = new Set<string>();

  for (const { line, value, regionName } of rawRows) {
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

    // Resolve regionId: per-row override > default region > null
    let resolvedRegionId: string | null = defaultRegion?.id ?? null;
    if (regionName) {
      const key = regionName.toLowerCase().trim();
      const match = regionByName.get(key) ?? regionBySlug.get(key);
      resolvedRegionId = match?.id ?? null;
    }

    valid.push({
      line,
      url: normalized.url,
      name: normalized.name,
      regionId: resolvedRegionId,
    });
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
      regionId: v.regionId,
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
      total: rawRows.length,
      intervalSeconds,
      regionName: defaultRegion?.name ?? null,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Format detection + parsing                                                 */
/* -------------------------------------------------------------------------- */

type RawRow = { line: number; value: string; regionName: string | null };

type ParseResult =
  | { ok: false; error: string }
  | { ok: true; rawRows: RawRow[]; hasRegionColumn: boolean };

function detectAndParse(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "File is empty." };

  const firstLine = trimmed.split(/\r?\n/)[0].trim();
  const firstCells = firstLine.split(",").map((c) => c.trim());

  const hasDomainHeader = firstCells.some((c) =>
    KNOWN_DOMAIN_HEADERS.test(c)
  );

  if (hasDomainHeader) {
    return parseWithHeader(trimmed);
  }

  return parseHeaderless(trimmed);
}

/**
 * New format: header row with named columns.
 * Supports optional "region" column.
 */
function parseWithHeader(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const fatalErrors = parsed.errors.filter(
    (e) => e.type !== "Delimiter" && e.code !== "UndetectableDelimiter"
  );
  if (fatalErrors.length > 0) {
    return { ok: false, error: `CSV parse failed: ${fatalErrors[0].message}` };
  }

  const fields = parsed.meta.fields ?? [];

  const domainCol = fields.find((f) =>
    KNOWN_DOMAIN_HEADERS.test(f.trim())
  );

  if (!domainCol) {
    return {
      ok: false,
      error:
        'CSV header found but no domain column detected. Use "domain", "url", or "host" as the column name.',
    };
  }

  const regionCol = fields.find((f) =>
    KNOWN_REGION_HEADER.test(f.trim())
  );

  const rawRows: RawRow[] = [];

  parsed.data.forEach((row, idx) => {
    const cell = String(row[domainCol] ?? "").trim();
    if (!cell) return;

    const regionCell = regionCol
      ? String(row[regionCol] ?? "").trim() || null
      : null;

    rawRows.push({ line: idx + 2, value: cell, regionName: regionCell });
  });

  return { ok: true, rawRows, hasRegionColumn: !!regionCol };
}

/**
 * Legacy format: no header, one domain per line.
 * First column is the domain. No region column support.
 */
function parseHeaderless(text: string): ParseResult {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });

  const fatalErrors = parsed.errors.filter(
    (e) => e.type !== "Delimiter" && e.code !== "UndetectableDelimiter"
  );
  if (fatalErrors.length > 0) {
    return { ok: false, error: `CSV parse failed: ${fatalErrors[0].message}` };
  }

  const rawRows: RawRow[] = [];

  parsed.data.forEach((row, idx) => {
    const cell = String(row?.[0] ?? "").trim();
    if (!cell) return;

    if (idx === 0 && KNOWN_DOMAIN_HEADERS.test(cell)) {
      return;
    }

    rawRows.push({ line: idx + 1, value: cell, regionName: null });
  });

  return { ok: true, rawRows, hasRegionColumn: false };
}

/* -------------------------------------------------------------------------- */
/*  URL normalization                                                          */
/* -------------------------------------------------------------------------- */

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