# Latency — File Reference

Per-file description of every source file, what it does, and its role in the project. Files are grouped by role.

---

## Root configuration

### `package.json`
Project manifest. Dependencies: Next.js 16, React 19, Prisma 6, Auth.js v5 beta, Resend, Recharts, Lucide, Zod, bcryptjs, papaparse, undici, next-themes, tailwind-merge, clsx. Scripts:
- `dev` — starts Next.js dev server
- `build` — runs `prisma generate && prisma migrate deploy && next build`
- `start` — runs production build
- `postinstall` — runs `prisma generate` so Prisma Client is available immediately after `npm install`

### `render.yaml`
Render Blueprint. Declares the web service (Node runtime, build/start commands, region, environment variable placeholders with `sync: false` for secrets). Enables reproducible deploys.

### `.env.example`
Template listing every required environment variable without values. Committed to the repo. Actual `.env` is git-ignored.

### `.gitignore`
Standard Next.js gitignore plus explicit `.env` exclusion so secrets never enter git history.

### `tsconfig.json`
TypeScript configuration. Standard Next.js setup with `@/*` path alias pointing to project root.

### `next.config.ts` / `next.config.js`
Next.js configuration. Default from `create-next-app`, no custom overrides.

### `postcss.config.mjs`
PostCSS configuration for Tailwind CSS v4.

### `eslint.config.mjs`
ESLint configuration using `eslint-config-next`.

### `auth.ts`
Auth.js v5 configuration at project root. Exports `handlers`, `auth`, `signIn`, `signOut`. Configures:
- Prisma adapter for user + verification token persistence
- JWT session strategy (required by Credentials provider)
- Credentials provider with bcrypt password comparison
- Resend provider for magic-link auth
- `trustHost: true` for Render deployment
- JWT and session callbacks to include user `id`

### `proxy.ts` (or `middleware.ts`)
Next.js 16 uses `proxy.ts` (renamed from `middleware.ts`). Protects `/dashboard/*` routes — redirects unauthenticated visitors to `/signin`.

---

## App — top level

### `app/layout.tsx`
Root layout. Loads Geist Sans + Geist Mono fonts, wraps children in `ThemeProvider` (three themes: corporate, light, dark), defaults to corporate. Applies `data-theme` attribute on `<html>` so CSS variables switch.

### `app/globals.css`
Global CSS. Defines three theme token sets (`:root` / `[data-theme="corporate"]`, `[data-theme="light"]`, `[data-theme="dark"]`) as CSS custom properties. Maps them into Tailwind's `@theme inline`. Defines keyframe animations (`fade-up`, `pulse-dot`, `scan`) and utility classes.

### `app/page.tsx`
Public landing page. Hero + features grid + comparison table + pricing card + FAQ + final CTA + footer. Toned-down design with no animations for corporate aesthetic. Shows a different CTA if the user is already signed in.

---

## App — API routes

### `app/api/auth/[...nextauth]/route.ts`
Standard Auth.js API route. Re-exports the `handlers` from `auth.ts` as `GET` and `POST`.

### `app/api/cron/run-checks/route.ts`
Protected cron endpoint. Validates `Authorization: Bearer <CRON_SECRET>`, returns 401 on mismatch. Finds monitors where `isPaused = false AND nextCheckAt <= now()`, capped at 50 per invocation. Runs checks with concurrency 5 via `runWithConcurrency`. Returns JSON `{ ok, checked, durationMs }`. Handles both `POST` and `GET` for scheduler compatibility.

### `app/api/signout/route.ts`
Sign-out endpoint. Calls Auth.js `signOut`, then redirects to `/`. Derives origin from `AUTH_URL` or request headers so it never redirects to localhost in production.

---

## App — auth pages

### `app/signin/page.tsx`
Sign-in page. Dual-form layout: password sign-in on top, "or" divider, magic-link form below. Uses `useActionState` for both server actions.

### `app/signin/actions.ts`
Server actions for sign-in:
- `signInWithPassword` — calls Auth.js `signIn("credentials", ...)`; catches `CredentialsSignin` errors and returns friendly messages
- `signInWithMagicLink` — calls Auth.js `signIn("resend", ...)`

### `app/signin/verify/page.tsx`
"Check your email" page shown after a magic-link submission.

### `app/signup/page.tsx`
Signup form. Optional name, required email + password + confirm-password. Displays per-field Zod validation errors.

### `app/signup/actions.ts`
`signup` server action. Zod-validates input, checks for existing user (with a special message if the email already exists as a magic-link account without a password), bcrypt-hashes password, creates user row, auto-signs-in via Credentials provider.

---

## App — dashboard shell

### `app/dashboard/layout.tsx`
Dashboard layout. Fetches session server-side, renders `<Sidebar />` alongside main content area. Auth is enforced via the middleware/proxy for the whole `/dashboard/*` tree.

### `app/dashboard/page.tsx` (Overview)
Overview page. Fetches per-user aggregate stats:
- Uptime percentage over last 24h (`uptimeForMonitors`)
- Average latency over last 24h (`avgLatency`)
- Hourly latency buckets for the 24h chart (`hourlyLatency`, SQL-aggregated)
- Active incident count
- Recent 5 incidents

Renders operational status banner, four stat cards, `UptimeChart`, and recent incidents list.

### `app/dashboard/add-page-tabs.tsx`
**Note: potentially unused duplicate.** A copy of `components/add-page-tabs.tsx` sitting in the `dashboard/` folder. Should be identified and removed if not imported anywhere. Only one of these two files is actually used by the Add page.

---

## App — monitors

### `app/dashboard/monitors/page.tsx`
Monitors list page. Uses `prisma.$queryRaw` with `DISTINCT ON (monitorId)` to fetch the latest check per monitor in one efficient query (bypasses Prisma's memory-heavy `include: { checks: { take: 1 } }` pattern). Renders `<MonitorsTable>` with sortable columns. Header actions: `BulkIntervalForm`, `DeleteAllButton`, `RunAllButton`, "New monitor" link.

### `app/dashboard/monitors/actions.ts`
All monitor server actions:
- `createMonitor` — Zod-validated create with discriminated union for HTTP/TCP/SSL
- `deleteMonitor` — owner-scoped delete
- `togglePause` — flips paused state; on pause, closes all open incidents for the monitor with a "monitor paused" cause note appended
- `runAllMonitors` — marks every non-paused monitor as immediately due
- `deleteAllMonitors` — nuclear delete of everything owned by the user
- `editMonitor` — Zod-validated update (type not editable to preserve check history)
- `bulkUpdateInterval` — sets `intervalSeconds` for all user monitors and re-staggers `nextCheckAt` across the new window
- `reconcileIncidents` — closes open incidents whose monitor is currently UP (uses check timestamp) or paused (with cause note)

### `app/dashboard/monitors/run-now.ts`
`runNow` server action. Owner-scoped fetch of a single monitor, then calls `runMonitorCheck` inline (synchronous, ~1-2s) and revalidates paths so the row updates on refresh.

### `app/dashboard/monitors/edit-target.ts`
**Note: likely unused.** A minimal server action for updating just a monitor's target URL, created during an earlier iteration as a testing helper. Superseded by `editMonitor` in `actions.ts`. Verify nothing imports it and delete if orphaned.

---

## App — add

### `app/dashboard/add/page.tsx`
Add-monitor page. Renders `<AddPageTabs>` inside a card.

### `app/dashboard/add/import-actions.ts`
`importDomainsCsv` server action. Parses uploaded CSV via papaparse (tolerating single-column bare-domain lists), normalizes each row to a full HTTPS URL, deduplicates against existing user monitors, bulk-creates via `createMany` with **staggered `nextCheckAt`** across the interval window to avoid burst load on cron.

---

## App — incidents / status / webhooks / architecture / account

### `app/dashboard/incidents/page.tsx`
Incidents page. Fetches all incidents for the user's monitors, splits into Active (unresolved) and Resolved sections. Header action: `ReconcileIncidentsButton`.

### `app/dashboard/status/page.tsx`
Status pages management. Lists existing user status pages with `CopyUrlButton`, external link, delete. Below the list: `<StatusPageForm>` for creating new ones. Derives the public URL prefix from request headers.

### `app/dashboard/status/actions.ts`
Server actions for status pages: `createStatusPage` (Zod-validates title, slug, selected monitor IDs), `deleteStatusPage`.

### `app/dashboard/webhooks/page.tsx`
Webhooks management. Lists user's webhooks with masked secret, active/paused badge, subscribed events. Actions per webhook: test-fire button, toggle active, delete. Includes the HMAC verification snippet at the bottom.

### `app/dashboard/webhooks/actions.ts`
Webhook server actions:
- `createWebhook` — generates 32-byte secret, returns it once in the response
- `deleteWebhook`
- `toggleWebhook`
- `testWebhook` — fires a `webhook.test` payload (test events bypass the subscription check)

### `app/dashboard/architecture/page.tsx`
Static "how it's built" page. Renders stack table, check flow diagram, webhook signature scheme, data model, security notes, deployment steps. Purely informational — no data fetching.

### `app/dashboard/account/page.tsx`
Account page. Header card with gradient avatar and stats (monitor / status page / webhook counts). Below: `NameForm`, `PasswordForm` (set or change), read-only info (email, sign-in method, member since, user ID). Danger zone: `DeleteAccountForm` with typed confirmation.

### `app/dashboard/account/actions.ts`
Account server actions: `updateName`, `setOrChangePassword` (requires current password if one exists), `deleteAccount` (typed "delete" confirmation, signs out then redirects).

---

## App — public status pages

### `app/s/[slug]/page.tsx`
Public read-only status page. No auth required. Fetches the status page by slug, its selected monitors, the latest check per monitor, 30-day daily uptime bars, and last-30-day incidents. Renders overall operational banner + monitor list with uptime bars + incident timeline. Only exposes monitors explicitly listed in `monitorIds[]`.

---

## Components — chrome

### `components/Sidebar.tsx`
Left dashboard sidebar. Brand block with the three-way theme toggle. Nav items: Overview, Monitors, Add, Incidents, Status, Webhooks, Architecture, Account. Active-item highlight. Footer with user email + sign-out button.

### `components/theme-provider.tsx`
Client-only wrapper around `next-themes` `ThemeProvider`.

### `components/theme-toggle.tsx`
Three-icon theme switcher (Building icon = Corporate, Sun = Light, Moon = Dark). Uses `next-themes` `useTheme` hook. Renders as a segmented control.

---

## Components — UI primitives

### `components/ui/primitives.tsx`
Design system primitives: `Card`, `CardHeader`, `CardBody`, `Button` (variants: primary, secondary, ghost, danger), `Badge` (variants: up, down, degraded, neutral, accent), `StatusDot` (animated pulse), `PageHeader`. All use CSS variable tokens so they inherit whichever theme is active.

---

## Components — monitors

### `components/monitor-form.tsx`
Manual add-monitor form. Tabbed layout for HTTP / TCP / SSL. Shows different fields per tab (HTTP has expectedStatus, TCP is host:port, SSL is hostname only). Uses `useActionState` with `createMonitor`.

### `components/monitor-row.tsx`
Single table row for the Monitors page. Renders status dot, name, type, target, sparkline, latency, status badge, and action icons (simulate incident, edit, run now, pause/resume, delete). Includes a client-only `RelativeTime` component for "Last check X ago" to avoid SSR hydration mismatch.

### `components/monitors-table.tsx`
Client-side sortable table wrapper. Manages sort state (`sortKey`, `sortDir`) with a three-click cycle (asc → desc → clear). Sortable columns: Name, Type, Target, Latency, Status. Renders sort chevrons on the active column.

### `components/sparkline.tsx`
Small Recharts line chart. Renders last 30 check response times per monitor row. Placeholder if fewer than 2 data points.

### `components/uptime-chart.tsx`
Recharts area chart for the Overview page. Renders 24 hourly buckets of average latency with a gradient fill. Empty state if no data.

### `components/uptime-bar.tsx`
30-day daily uptime bars for public status pages. Green segment = day was up, red = down, neutral = no data. Shows uptime % below.

### `components/edit-monitor-modal.tsx`
Portal-rendered edit modal. Uses `useActionState` with `editMonitor`. Escape/backdrop close. Body scroll lock while open. Type is displayed but not editable.

### `components/import-csv-form.tsx`
CSV import form. File picker with drag-drop styling, interval dropdown (1 min to 1 hr), submit button. Post-import: renders success card with counts and any invalid rows in a compact table.

### `components/add-page-tabs.tsx`
Client-side tab switcher for the Add page. Toggles between `MonitorForm` (single monitor) and `ImportCsvForm` (bulk).

### `components/run-all-button.tsx`
Confirmation-gated button that marks all non-paused monitors as immediately due. Uses `useTransition` for pending state, shows "Scheduled" on success for a few seconds.

### `components/delete-all-button.tsx`
Portal-rendered modal with typed confirmation (`delete all`). Escape/backdrop close. Body scroll lock. Uses `useTransition`.

### `components/reconcile-incidents-button.tsx`
Confirmation-gated button that runs `reconcileIncidents`. Shows result count ("N closed") for 5 seconds after completion.

---

## Components — webhooks

### `components/webhook-form.tsx`
Webhook creation form. URL + event checkboxes. On success, shows a one-time secret-reveal card with a copy button (secret cannot be seen again after this).

### `components/webhook-test-button.tsx`
Small button that fires a `webhook.test` payload. Shows HTTP status or error message inline next to the button.

---

## Components — status pages

### `components/status-page-form.tsx`
Create-status-page form. Title, slug, checkbox list of user's monitors. Zod-validated with per-field errors.

### `components/copy-url-button.tsx`
Copy-to-clipboard button with fallback to `window.prompt` if Clipboard API is unavailable.

---

## Components — account

### `components/account-form.tsx`
Contains three forms:
- `NameForm` — update display name
- `PasswordForm` — set or change password (requires current password when one exists)
- `DeleteAccountForm` — typed "delete" confirmation

---

## Library — auth + utils

### `lib/prisma.ts`
Prisma Client singleton with dev/prod-aware logging. Prevents multiple client instances in dev (Turbopack HMR).

### `lib/auth-helpers.ts`
`requireUser` helper. Server-component friendly. Returns the authenticated user or redirects to `/signin`.

### `lib/utils.ts`
`cn(...)` classname helper using clsx + tailwind-merge.

---

## Library — validation

### `lib/validation/monitor.ts`
Zod schemas for monitor creation. Discriminated union on `type` (HTTP / TCP / SSL) with per-type target validation. Base schema shared: name, intervalSeconds, timeoutMs.

### `lib/validation/password.ts`
Zod schemas: `passwordSchema` (min 8 chars, at least one letter and one number), `emailSchema` (trimmed + lowercased + email format).

### `lib/status-page.ts`
Slug validation. `slugSchema` (lowercase, alphanumeric + hyphens, must start with letter, 3-40 chars). `RESERVED_SLUGS` blocklist (api, dashboard, admin, etc.). `generateSlug` helper.

---

## Library — stats and aggregation

### `lib/stats.ts`
Server-side aggregation queries for dashboard rendering:
- `uptimeForMonitors` — Prisma `groupBy` on `status` for uptime %
- `avgLatency` — Prisma `aggregate` `_avg` for average response time
- `hourlyLatency` — `$queryRaw` SQL with `date_trunc('hour', ...)` and `AVG`. Returns 24 buckets. Critical: avoids loading tens of thousands of rows into Node memory.
- `recentChecksForSparkline` — `findMany` for last 30 checks of a single monitor
- `dailyUptimeForMonitor` — `$queryRaw` SQL with `date_trunc('day', ...)` and `CASE WHEN` aggregation. Returns 30 daily UP/DOWN indicators.

---

## Library — checkers (the actual monitoring logic)

### `lib/checkers/http.ts`
`checkHttp` executes an HTTP GET check. AbortController for timeout. Follows redirects. Returns UP if status matches `expectedStatus`, otherwise DOWN with a descriptive error. Wraps `fetch` errors (timeout, DNS, connection reset) as human-readable messages truncated to 500 chars.

### `lib/checkers/tcp.ts`
`checkTcp` opens a `net.Socket` to `host:port`, measures connect time. Cleans up socket in all cases. Returns UP on connect, DOWN on timeout or error.

### `lib/checkers/ssl.ts`
`checkSsl` performs a TLS handshake using Node's `tls.connect`. Extracts certificate expiry via `getPeerCertificate`. UP if valid and expiry >14 days; UP with warning if expiring in <14 days; DOWN if expired or invalid.

### `lib/checkers/runner.ts`
Two exports:
- `runMonitorCheck` — orchestrates a single monitor check. Runs the appropriate checker, then inside a Prisma transaction (20s timeout): inserts a `Check` row, updates monitor `nextCheckAt`/`lastCheckedAt`, opens/resolves incidents on state transitions. After commit, fires matching webhooks via `fanOutEvent` (fire-and-forget).
- `runWithConcurrency` — inline worker-pool implementation for bounded parallelism without adding a dependency.

---

## Library — webhooks

### `lib/webhooks.ts`
Webhook signing and delivery:
- `generateWebhookSecret` — 32-byte base64url random
- `signPayload` — HMAC-SHA256 in the `sha256=<hex>` GitHub format
- `maskSecret` — display helper for showing a redacted secret in the UI
- `deliverWebhook` — fetches webhook config, checks active + subscribed events (bypass for test events), signs body, POSTs with 10s timeout, includes `X-Latency-Signature` / `X-Latency-Event` / `X-Latency-Delivery` headers. Returns `{ ok, status, error }`.
- `fanOutEvent` — fire-and-forget wrapper that queries subscribed webhooks and calls `deliverWebhook` for each in parallel

---

## Prisma

### `prisma/schema.prisma`
Data model source of truth. Defines:
- Auth.js standard models (`User`, `Account`, `Session`, `VerificationToken`)
- Domain models (`Monitor`, `Check`, `Incident`, `StatusPage`, `Webhook`)
- Enums (`MonitorType`, `CheckStatus`)
- Indexes on `Monitor(userId)`, `Monitor(nextCheckAt)`, `Check(monitorId, checkedAt)`
- Cascade deletes from `User` down to all owned rows

### `prisma/migrations/`
Migration history. Each subfolder is one applied migration with its SQL. Applied automatically by `prisma migrate deploy` during Render's build.

---

## Docs

### `README.md`
Public-facing README. Feature list, tech stack, architecture diagram, local dev setup, environment variable reference, deployment guide, cron setup guide, webhook payload spec, data model summary, security posture, known limitations, roadmap.

### `docs/TECHNICAL_WRITEUP.md`
Deeper technical narrative. Architecture rationale, key decisions with trade-offs, data model detail, check execution flow, webhook signature scheme, security posture, deferred work, iteration history (including failed diagnoses), testing methodology, repository layout.

### `docs/FILE_REFERENCE.md`
This document. Per-file description of what every source file does.
