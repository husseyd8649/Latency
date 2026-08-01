// lib/validation/monitor.ts
import { z } from "zod";

/** Shared fields */
const base = z.object({
  name: z.string().min(1, "Name is required").max(80),
  intervalSeconds: z.coerce
    .number()
    .int()
    .min(60, "Minimum 60 seconds")
    .max(86400, "Maximum 24 hours"),
  timeoutMs: z.coerce
    .number()
    .int()
    .min(1000, "Minimum 1000 ms")
    .max(60000, "Maximum 60000 ms"),
});

export const httpMonitorSchema = base.extend({
  type: z.literal("HTTP"),
  target: z
    .string()
    .url("Must be a valid URL, e.g. https://example.com")
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
  expectedStatus: z.coerce
    .number()
    .int()
    .min(100)
    .max(599)
    .default(200),
});

export const tcpMonitorSchema = base.extend({
  type: z.literal("TCP"),
  /** Stored as "host:port" */
  target: z
    .string()
    .regex(
      /^[a-zA-Z0-9.-]+:\d{1,5}$/,
      'Format: "host:port" (e.g. "db.example.com:5432")'
    ),
});

export const sslMonitorSchema = base.extend({
  type: z.literal("SSL"),
  /** Just the hostname */
  target: z
    .string()
    .regex(
      /^[a-zA-Z0-9.-]+$/,
      "Enter a hostname only (no protocol, no port)"
    ),
});

export const monitorSchema = z.discriminatedUnion("type", [
  httpMonitorSchema,
  tcpMonitorSchema,
  sslMonitorSchema,
]);

export type MonitorInput = z.infer<typeof monitorSchema>;