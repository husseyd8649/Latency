// lib/status-page.ts
import { z } from "zod";

export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "dashboard",
  "signin",
  "signup",
  "s",
  "status",
  "www",
  "mail",
  "ftp",
  "localhost",
  "null",
  "undefined",
  "user",
  "users",
  "monitor",
  "monitors",
  "incident",
  "incidents",
  "webhook",
  "webhooks",
  "account",
  "settings",
  "billing",
  "pricing",
  "about",
  "contact",
  "help",
  "support",
  "docs",
  "documentation",
  "blog",
  "careers",
  "jobs",
  "terms",
  "privacy",
  "cookies",
  "legal",
  "security",
  "trust",
  "abuse",
  "report",
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Slug must be at least 3 characters")
  .max(40, "Slug must be 40 characters or less")
  .regex(/^[a-z][a-z0-9-]*$/, "Slug must start with a letter and contain only letters, numbers, and hyphens")
  .refine((s) => !RESERVED_SLUGS.has(s), "This slug is reserved");

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}