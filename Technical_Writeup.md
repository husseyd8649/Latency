# Latency — Technical Writeup

**Project**: Latency — Uptime monitoring for solo developers and small teams
**Author**: HUSAIN DEESAWALA.
**Live**: https://latency-4hkf.onrender.com/
**Source**: https://github.com/husseyd8649/Latency
**Date**: 08.01.2026

---

## 1. What Latency does

Latency monitors the availability of internet-facing services and notifies
the owner when something breaks. It handles three check types:

- **HTTP** — fetches a URL and validates the status code
- **TCP** — opens a socket to a host:port and measures connect time
- **SSL** — performs a TLS handshake and inspects certificate expiry

When a monitor transitions from UP to DOWN, an incident is opened. When it
transitions back to UP, the incident is resolved. Each transition can fire an
HMAC-signed HTTP webhook to a user-configured endpoint.

Users can also publish read-only **status pages** at `/s/<slug>` that show
current state, 30-day uptime bars, and recent incidents — no authentication
required for viewers.

---

## 2. Architecture at a glance
                cron-job.org (external)
                      |
                      v  POST /api/cron/run-checks (Bearer secret)
                +-----------+
                | Next.js   |  (Render web service)
                |  app      |
                +-----------+
                      |
                      v
                +-----------+
                | Postgres  |  (Render managed)
                +-----------+
                      |
                      v  outbound HMAC-signed webhook POST
                Your webhook target


The app is a single Next.js 16 (App Router) service. There is no separate
worker process. Checks are triggered by an external cron service hitting a
protected API route every minute. The route finds monitors whose
`nextCheckAt` has passed, runs their checks with bounded concurrency, writes
results to Postgres, and fans out webhooks on state transitions.

---

## 3. Key technical decisions

### 3.1 External cron over an in-process scheduler

**Chose**: cron-job.org hitting `POST /api/cron/run-checks` every minute.

**Considered**: BullMQ + Redis worker; `node-cron` in-process; Vercel cron.

**Why**: Keeps the app stateless and free-tier-friendly. A single Next.js
service on Render's free plan handles everything. No Redis, no separate
worker to deploy, no serverless cold-start concerns for the scheduler. The
trade-off is dependency on a third-party scheduler and a ~1 minute minimum
resolution, both acceptable for MVP.

### 3.2 JWT sessions instead of database sessions

**Chose**: Auth.js v5 with `session: { strategy: "jwt" }`.

**Why**: The Credentials (email+password) provider requires JWT sessions in
Auth.js — this isn't a preference, it's a constraint. I kept the Prisma
adapter for user records and email verification tokens (used by the magic-link
path) so both auth methods share one `User` table.

### 3.3 Password auth + magic link, side by side

**Chose**: Both email/password and Resend magic link, on the same sign-in
page.

**Why**: Password is the default users expect. Magic link is a safety net
when a user forgets their password (I deferred the full reset flow as tech
debt — magic link functions as a workaround). Users who signed up via magic
link are prompted on their Account page to optionally set a password.

### 3.4 Fire-and-forget webhook delivery after DB commit

**Chose**: `void (async () => { ... })()` outside the transaction.

**Why**: A slow or dead webhook target shouldn't block or roll back a check
result. Delivery happens after the DB commit, unawaited by the caller. This
means a webhook can be lost if the Node process dies mid-delivery — I chose
not to build a retry queue for MVP but documented it as tech debt.

### 3.5 Inline concurrency limiter instead of a dependency

**Chose**: A ~20-line inline worker-pool in `runWithConcurrency`.

**Why**: Only needed one thing (bounded parallelism), didn't need to pull in
`p-limit` or similar. Fewer dependencies, easier to reason about.

### 3.6 Tailwind v4 with CSS-variable-based theming

**Chose**: Design tokens as CSS custom properties, mapped into Tailwind's
`@theme inline` block. Dark/light theme switches by toggling a `.dark` class
on `<html>`.

**Why**: No runtime theming library, no `useTheme` polling. Colors change
because CSS variables change. The whole design system (colors, shadows,
spacing scale intent) is in `app/globals.css`. Coral accent (`oklch(67% .16
32)`) is used for identity across both themes; light theme uses a warm cream
background for a distinctive, non-generic look.

### 3.7 Prisma 6 (downgraded from 7)

**Chose**: Prisma 6 in `dependencies`.

**Why**: I initially installed Prisma 7 but the ecosystem hadn't caught up —
the Auth.js Prisma adapter and most tutorials assume Prisma 6's config format.
Downgrading resolved the friction. Prisma 7 migration is on the roadmap once
the ecosystem is ready.

---

## 4. Data model
User id, email(unique), passwordHash?, name?, createdAt
Monitor id, userId(fk), name, type(HTTP|TCP|SSL), target,
intervalSeconds, timeoutMs, expectedStatus?, isPaused,
lastCheckedAt?, nextCheckAt?, createdAt
Check id, monitorId(fk), status(UP|DOWN), responseTimeMs?,
statusCode?, error?, checkedAt
Incident id, monitorId(fk), startedAt, resolvedAt?, cause?
StatusPage id, userId(fk), slug(unique), title, monitorIds[]
Webhook id, userId(fk), url, secret, events[], isActive, createdAt

Auth.js Account, Session, VerificationToken (partly unused with JWT)


Cascades: deleting a `User` cascades to all owned rows.
Indexing: `Monitor.nextCheckAt` and `Check.(monitorId, checkedAt)` are
indexed to keep the cron scan and sparkline queries cheap.

---

## 5. Check execution flow

1. cron-job.org POSTs `/api/cron/run-checks` with a Bearer token
2. Endpoint validates the token against `CRON_SECRET`, returns 401 on mismatch
3. Query monitors where `isPaused = false AND nextCheckAt <= now()`, cap at 200
4. Run checks with concurrency of 10 via `runWithConcurrency`
5. Per monitor: execute HTTP/TCP/SSL check, get `{ status, responseTimeMs,
   statusCode, error }`
6. Inside a Postgres transaction:
   - Insert a `Check` row
   - Update `Monitor.lastCheckedAt` and `Monitor.nextCheckAt`
   - If previous check was UP and current is DOWN → create `Incident`
   - If previous check was DOWN and current is UP → resolve latest open `Incident`
7. After the transaction commits, fire matching webhooks (fire-and-forget)
8. Return JSON: `{ ok: true, checked: N, durationMs: M }`

---

## 6. Webhook signature scheme

Every payload is signed with the webhook's secret using HMAC-SHA256:
X-Latency-Signature: sha256=<hex_hmac>
X-Latency-Event: incident.started | incident.resolved | webhook.test
X-Latency-Delivery: <uuid v4


Body includes a `deliveredAt` ISO timestamp. Receivers should:

- Recompute HMAC over the raw body and compare using constant-time comparison
  (`crypto.timingSafeEqual`)
- Reject payloads with `deliveredAt` older than 5 minutes (basic replay
  protection)

The full verification snippet is on the in-app Architecture page and in the
README.

---

## 7. Security posture

- Passwords hashed with bcrypt cost factor 10; plaintext never stored or logged
- JWT sessions signed with a 32-byte random `AUTH_SECRET`
- Cron endpoint gated by 32-byte random `CRON_SECRET` in `Authorization: Bearer`
- Webhook secrets 32 random bytes, shown once at creation (GitHub PAT pattern)
- All mutations scoped to the acting `userId` — no cross-user access possible
- Public status pages expose only monitors explicitly listed in the page's
  `monitorIds` array
- Zod validation on every server action input
- Input length limits everywhere; error messages truncated to 500 chars in DB
- `AUTH_TRUST_HOST=true` on Render (behind Render's reverse proxy)

Not implemented in MVP: rate limiting, 2FA, audit logging, CSRF protection
beyond Auth.js defaults. Called out in the README.

---

## 8. What I deferred, and why

I made explicit calls to keep the MVP surface tight rather than large-and-
fragile:

- **Password reset flow** — magic-link serves as a workaround; full reset is
  another day of work
- **Webhook retry queue with backoff** — needs a durable queue (Redis or a
  polled DB table); out of scope for the free-tier target
- **Webhook delivery log** — would require a `WebhookDelivery` model and a
  UI to browse it
- **Rate limiting** — needs Redis or an external service; documented as a
  pre-production requirement
- **Email alerts** — Resend is already integrated for magic-link, but
  incident emails need templates and preferences
- **Inline monitor / status-page editing** — currently delete-and-recreate
- **Custom branding on status pages** — logos, custom domains, themes

Each is in the README under "Known limitations and tech debt".

---

## 9. Testing methodology

I did not write automated tests for the MVP — a deliberate scope decision
given the timeline. I tested manually through each phase using:

- **httpstat.us** for deterministic HTTP failures (500, timeout, etc.)
- **example.com** and common ports for positive TCP/SSL checks
- **expired.badssl.com** for SSL failure verification
- **webhook.site** for observing outbound webhook delivery and inspecting
  headers/signatures
- **Prisma Studio** for direct DB inspection during incident state debugging

Adding a test suite (Vitest + Playwright) is on the roadmap.

---

## 10. What I would change with more time

- Automated tests, starting with unit tests on `runMonitorCheck` and integration
  tests on the auth flows
- Webhook retry queue with a `WebhookDelivery` model
- Password reset via Resend
- Email alerts as a first-class notification channel
- Migrate `StatusPage.monitorIds String[]` to a proper join table
- Move `prisma` CLI from `dependencies` to `devDependencies` to slim the
  production bundle
- Add per-user timezone handling for chart labels
- Add OpenTelemetry-style tracing for check execution to surface slow monitors
- Consider Prisma 7 once the Auth.js adapter is fully compatible

---

## 11. Repository structure
app/
page.tsx Landing
signin/, signup/ Auth pages + server actions
dashboard/
layout.tsx Sidebar shell
page.tsx Overview
monitors/ CRUD + Run Now action
add/ Add-monitor form
incidents/ Incident timeline
status/ Status page manager
webhooks/ Webhook manager + actions
account/ Profile + password + delete account
architecture/ Static "how it's built" page
s/[slug]/ Public status pages
api/
auth/[...nextauth]/ Auth.js handler
cron/run-checks/ Protected cron endpoint
signout/ Sign-out route
components/
ui/primitives.tsx Button, Card, Badge, StatusDot, PageHeader
Sidebar.tsx, theme-*.tsx Chrome
monitor-form.tsx HTTP/TCP/SSL tabbed form
monitor-row.tsx Table row with sparkline + simulate toggle
sparkline.tsx Recharts mini chart
uptime-chart.tsx Recharts 24h area chart
uptime-bar.tsx 30-day daily bars for status pages
status-page-form.tsx Status page creation
webhook-form.tsx Webhook creation with one-time secret reveal
webhook-test-button.tsx Test-fire UX
account-form.tsx Name + password + delete forms
lib/
prisma.ts Prisma client singleton
auth-helpers.ts requireUser()
utils.ts cn() classname helper
stats.ts Uptime / latency / sparkline aggregations
status-page.ts Slug validation + reserved list
webhooks.ts HMAC signing + fan-out
validation/ Zod schemas
checkers/
http.ts, tcp.ts, ssl.ts Individual check implementations
runner.ts Orchestration + incident state machine
prisma/
schema.prisma Data model
migrations/ Migration history


---

## 12. How to reproduce locally

```bash
git clone https://github.com/husseyd8649/Latency.git
cd Latency
npm install
cp .env.example .env
# Fill DATABASE_URL, AUTH_SECRET, AUTH_URL, RESEND_API_KEY, EMAIL_FROM, CRON_SECRET
npx prisma migrate deploy
npm run dev
