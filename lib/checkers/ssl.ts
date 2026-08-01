// lib/checkers/ssl.ts
import tls from "node:tls";
import type { CheckResult } from "./http";

/** Warn (still UP) if cert expires within this many days. */
export const SSL_EXPIRY_WARN_DAYS = 14;

export async function checkSsl(opts: {
  hostname: string;
  timeoutMs: number;
}): Promise<CheckResult> {
  return new Promise<CheckResult>((resolve) => {
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

    const socket = tls.connect(
      {
        host: opts.hostname,
        port: 443,
        servername: opts.hostname, // SNI
        rejectUnauthorized: true,
        timeout: opts.timeoutMs,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          if (!cert || Object.keys(cert).length === 0) {
            return finish({
              status: "DOWN",
              responseTimeMs: Math.round(performance.now() - start),
              statusCode: null,
              error: "No certificate returned",
            });
          }

          const validTo = new Date(cert.valid_to);
          const now = Date.now();
          const daysLeft = Math.floor(
            (validTo.getTime() - now) / (1000 * 60 * 60 * 24)
          );

          if (daysLeft < 0) {
            return finish({
              status: "DOWN",
              responseTimeMs: Math.round(performance.now() - start),
              statusCode: null,
              error: `Certificate expired ${Math.abs(daysLeft)} day(s) ago`,
            });
          }

          if (daysLeft <= SSL_EXPIRY_WARN_DAYS) {
            return finish({
              status: "UP",
              responseTimeMs: Math.round(performance.now() - start),
              statusCode: null,
              error: `Certificate expires in ${daysLeft} day(s)`,
            });
          }

          return finish({
            status: "UP",
            responseTimeMs: Math.round(performance.now() - start),
            statusCode: null,
            error: null,
          });
        } catch (err) {
          finish({
            status: "DOWN",
            responseTimeMs: Math.round(performance.now() - start),
            statusCode: null,
            error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          });
        }
      }
    );

    socket.once("timeout", () => {
      finish({
        status: "DOWN",
        responseTimeMs: Math.round(performance.now() - start),
        statusCode: null,
        error: "TLS handshake timed out",
      });
    });

    socket.once("error", (err) => {
      finish({
        status: "DOWN",
        responseTimeMs: Math.round(performance.now() - start),
        statusCode: null,
        error: (err.message || "TLS error").slice(0, 500),
      });
    });
  });
}