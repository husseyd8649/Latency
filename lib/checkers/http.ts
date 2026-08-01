// lib/checkers/http.ts
import { Agent } from "undici";
import { lookup } from "node:dns/promises";

export type CheckResult = {
  status: "UP" | "DOWN";
  responseTimeMs: number | null;
  statusCode: number | null;
  error: string | null;
};

// Force IPv4-only DNS to avoid Render's flaky outbound IPv6 routing.
const ipv4Dispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      lookup(hostname, { family: 4 })
        .then((res) => callback(null, res.address, 4))
        .catch(callback);
    },
  },
});

export async function checkHttp(opts: {
  url: string;
  timeoutMs: number;
  expectedStatus: number;
}): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(opts.url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LatencyBot/1.0; +https://latency-4hkf.onrender.com)",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // @ts-expect-error — undici dispatcher is valid at runtime
      dispatcher: ipv4Dispatcher,
    });

    const responseTimeMs = Math.round(performance.now() - start);
    const ok = res.status === opts.expectedStatus;

    return {
      status: ok ? "UP" : "DOWN",
      responseTimeMs,
      statusCode: res.status,
      error: ok ? null : `Expected ${opts.expectedStatus}, got ${res.status}`,
    };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start);
    const message = errorMessage(err);
    return {
      status: "DOWN",
      responseTimeMs,
      statusCode: null,
      error: truncate(message, 500),
    };
  } finally {
    clearTimeout(timer);
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Request timed out";
    return err.message || err.name;
  }
  return String(err);
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
