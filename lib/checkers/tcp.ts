// lib/checkers/tcp.ts
import net from "node:net";
import type { CheckResult } from "./http";

export async function checkTcp(opts: {
  target: string; // "host:port"
  timeoutMs: number;
}): Promise<CheckResult> {
  const [host, portStr] = opts.target.split(":");
  const port = Number(portStr);

  if (!host || !Number.isFinite(port)) {
    return {
      status: "DOWN",
      responseTimeMs: null,
      statusCode: null,
      error: "Invalid target format (expected host:port)",
    };
  }

  return new Promise<CheckResult>((resolve) => {
    const socket = new net.Socket();
    const start = performance.now();
    let settled = false;

    const finish = (result: CheckResult) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    socket.setTimeout(opts.timeoutMs);

    socket.once("connect", () => {
      finish({
        status: "UP",
        responseTimeMs: Math.round(performance.now() - start),
        statusCode: null,
        error: null,
      });
    });

    socket.once("timeout", () => {
      finish({
        status: "DOWN",
        responseTimeMs: Math.round(performance.now() - start),
        statusCode: null,
        error: "Connection timed out",
      });
    });

    socket.once("error", (err) => {
      finish({
        status: "DOWN",
        responseTimeMs: Math.round(performance.now() - start),
        statusCode: null,
        error: (err.message || "Connection error").slice(0, 500),
      });
    });

    try {
      socket.connect(port, host);
    } catch (err) {
      finish({
        status: "DOWN",
        responseTimeMs: null,
        statusCode: null,
        error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
      });
    }
  });
}