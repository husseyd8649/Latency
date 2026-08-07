# Latency

> Uptime monitoring built for solo developers and small teams. HTTP, TCP and SSL checks with public status pages and HMAC-signed webhooks.

![Status](https://img.shields.io/badge/status-MVP-orange)
![Stack](https://img.shields.io/badge/stack-Next.js%2016-black)
![Auth](https://img.shields.io/badge/auth-Auth.js%20v5-blue)
![DB](https://img.shields.io/badge/db-PostgreSQL-336791)

Latency is a focused, opinionated uptime monitor. Add a URL, hostname, or port; checks run on a schedule you choose; you get a live dashboard, a public status page, and signed webhooks when a monitor changes state.

Built as an MVP prototype, end-to-end.

- **Live**: https://latency-4hkf.onrender.com/
- **Repo**: https://github.com/husseyd8649/Latency

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Cron setup](#cron-setup)
- [Webhook payload and verification](#webhook-payload-and-verification)
- [Data model](#data-model)
- [Security](#security)
- [Known limitations and tech debt](#known-limitations-and-tech-debt)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **HTTP, TCP, and SSL monitoring** with configurable per-monitor intervals (from 1 minute to 24 hours)
- **Bulk CSV import** — one domain per line, up to 1000 rows per import, with staggered `nextCheckAt` to spread load
- **Incident lifecycle** — automatic UP→DOWN incident open, DOWN→UP resolve, with per-user history
- **Reconcile action** — one-click cleanup of stale open incidents (closes any whose monitor is now UP or paused)
- **Pause auto-resolves incidents** for the paused monitor so counts stay clean
- **Bulk interval update** — change interval for all monitors at once, with re-staggering
- **Run all** — mark every active monitor as immediately due for the next cron tick
- **Delete all** with typed confirmation ("delete all")
- **Public status pages** at `/s/<slug>` with 30-day uptime bars and recent incidents (no auth for viewers)
- **HMAC-SHA256 signed webhooks** with test-fire button; secret shown once at creation
- **Three themes** — Corporate (default, white + neutral blue), Light (warm cream + coral), Dark (slate + coral)
- **Sortable table columns** on the Monitors page (client-side, in-session)
- **Inline monitor editing** via modal (type is intentionally non-editable to preserve check history)
- **Simulate incident** toggle for demos (client-side only, does not touch DB)
- **Email + password** auth via Auth.js v5 (Credentials, bcryptjs) and **magic link** via Resend

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-based config via `@theme`) |
| Icons | Lucide |
| Charts | Recharts |
| Auth | Auth.js v5 (JWT sessions) |
| Password hashing | bcryptjs (cost 10) |
| Email | Resend |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Validation | Zod |
| Theming | next-themes with three-way toggle |
| Hosting | Render (free web tier + free managed Postgres) |
| Scheduler | cron-job.org (external HTTP cron) |

---

## Architecture

```
                    ┌─────────────────────┐
                    │   cron-job.org      │
                    │  (every minute)     │
                    └──────────┬──────────┘
                               │  POST /api/cron/run-checks
                               │  Authorization: Bearer <CRON_SECRET>
                               ▼
     ┌──────────────────────────────────────────────────┐
     │            Next.js app (Render)                  │
     │                                                  │
     │  ┌────────────┐   ┌───────────┐   ┌───────────┐  │
     │  │ Dashboard  │   │  Cron API │   │ Public /s │  │
     │  │  (auth)    │   │  handler  │   │  (public) │  │
     │  └────┬───────┘   └─────┬─────┘   └─────┬─────┘  │
     │       │                 │               │        │
     │       └────────┬────────┴───────────────┘        │
     │                │                                 │
     │       ┌────────▼─────────┐                       │
     │       │   Prisma Client  │                       │
     │       └────────┬─────────┘                       │
     └────────────────┼─────────────────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  PostgreSQL      │
            │  (Render)        │
            └──────────────────┘

                Outbound HMAC-signed webhooks
                ▲
                │
     ┌──────────┴───────────┐
     │  Your webhook target │
     │  verifies signature  │
     └──────────────────────┘
```

Single Next.js service. No worker process. Cron is external. Everything lives in one app talking to one Postgres.

---

## Local development

### Prerequisites

- Node.js 20+
- npm 10+
- A PostgreSQL database (local, Neon, Supabase, or Render free tier)
- A Resend account for email delivery

### Setup

```bash
git clone https://github.com/husseyd8649/Latency.git
cd Latency
npm install
cp .env.example .env
# Fill in .env values (see Environment variables below)
npx prisma migrate dev
npm run dev
```

Visit `http://localhost:3000`.

### Common commands

```bash
npm run dev              # start dev server
npm run build            # generate Prisma, migrate, build Next.js
npm run start            # start production build
npm run lint             # eslint
npx prisma studio        # inspect the database in a UI
npx prisma migrate dev   # create + apply a new migration
```

### Running checks locally

Checks are not automatic in dev. Trigger them one of two ways:

- Click **Run now** (lightning icon) on any monitor row
- Call the cron endpoint manually:

```bash
curl -X POST http://localhost:3000/api/cron/run-checks \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Windows PowerShell: prefix with `curl.exe` (the built-in `curl` alias is `Invoke-WebRequest`, different syntax).

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (append `?connection_limit=15&pool_timeout=20` for pool tuning) |
| `AUTH_SECRET` | Auth.js JWT signing secret (32+ random bytes, base64) |
| `AUTH_URL` | Fully-qualified deployment URL (e.g., `https://latency-4hkf.onrender.com`) |
| `AUTH_TRUST_HOST` | `true` on non-Vercel hosts |
| `RESEND_API_KEY` | Resend API key for magic-link email |
| `EMAIL_FROM` | Sender address (use `onboarding@resend.dev` on free tier) |
| `CRON_SECRET` | Bearer token protecting `/api/cron/run-checks` (32+ random bytes) |

Generate secrets:

```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Never commit `.env`.** `.env.example` is the tracked template.

---

## Deployment

Runs cleanly on Render's free tier as a single web service plus managed Postgres.

### Deploy to Render

1. Push this repo to GitHub
2. In Render, create a **Blueprint** and select this repo — the included `render.yaml` will define the web service
3. Fill in the prompted secret values (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `RESEND_API_KEY`, `CRON_SECRET`)
4. Deploy. Once you have the assigned `<name>.onrender.com` URL, update `AUTH_URL` to match and redeploy

### Notes

- `postinstall` runs `prisma generate`. `build` runs `prisma migrate deploy && next build`. Migrations apply automatically on every deploy.
- Render free web tier sleeps after ~15 min idle. First request after inactivity takes 30–60 seconds to cold-start.
- Render free Postgres has a documented expiration window — set a calendar reminder.
- **Render free tier has a 512MB RAM ceiling per web instance.** At 500-monitor scale, queries must aggregate in SQL rather than in JavaScript to stay under this. See `lib/stats.ts` for the pattern.

---

## Cron setup

Checks are triggered externally, not by the app.

### cron-job.org (free)

1. Sign up at https://cron-job.org
2. Create a job:
   - URL: `https://<your-site>.onrender.com/api/cron/run-checks`
   - Schedule: every 1 minute
   - Request method: `POST`
   - Advanced → Request headers → add `Authorization: Bearer <YOUR_CRON_SECRET>`
   - **Disable** "HTTP Authentication" (the checkbox for Basic Auth — do not enable both)
3. Save and enable

Response body is JSON: `{ "ok": true, "checked": N, "durationMs": XXX }`.

Endpoint is capped at 50 monitors per invocation to fit within the free scheduler's per-request timeout. Full cycle across N monitors takes `N/50` ticks.

### Alternative schedulers

Any HTTP scheduler works: GitHub Actions cron, Upstash QStash, EasyCron, your own machine's cron.

---

## Webhook payload and verification

Every incident state change fires an HTTP POST to your subscribed webhooks.

### Headers

| Header | Example |
| --- | --- |
| `Content-Type` | `application/json` |
| `X-Latency-Event` | `incident.started` \| `incident.resolved` \| `webhook.test` |
| `X-Latency-Signature` | `sha256=<hex_hmac>` |
| `X-Latency-Delivery` | `<uuid v4>` |
| `User-Agent` | `Latency-Webhook/1.0` |

### Body

```json
{
  "event": "incident.started",
  "deliveredAt": "2025-01-15T12:34:56.789Z",
  "monitor": {
    "id": "clx…",
    "name": "Production API",
    "type": "HTTP",
    "target": "https://api.example.com/health"
  },
  "incident": {
    "id": "clx…",
    "startedAt": "2025-01-15T12:34:52.101Z",
    "resolvedAt": null,
    "cause": "Expected 200, got 502"
  }
}
```

`incident.resolved` events include a populated `resolvedAt`. `webhook.test` events include `"test": true` and no monitor/incident fields.

### Verifying signatures (Node.js)

```js
import crypto from "node:crypto";

function verifySignature(secret, rawBody, header) {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

Use the **raw request body**, not the parsed JSON. Reject payloads with `deliveredAt` older than ~5 minutes for basic replay protection.

---

## Data model

Simplified schema. Source of truth is `prisma/schema.prisma`.

| Model | Key fields |
| --- | --- |
| `User` | `id`, `email` (unique), `passwordHash?`, `name?`, `createdAt` |
| `Monitor` | `id`, `userId`, `name`, `type` (HTTP \| TCP \| SSL), `target`, `intervalSeconds`, `timeoutMs`, `expectedStatus?`, `isPaused`, `nextCheckAt?`, `lastCheckedAt?` |
| `Check` | `id`, `monitorId`, `status` (UP \| DOWN), `responseTimeMs?`, `statusCode?`, `error?`, `checkedAt` |
| `Incident` | `id`, `monitorId`, `startedAt`, `resolvedAt?`, `cause?` |
| `StatusPage` | `id`, `userId`, `slug` (unique), `title`, `monitorIds[]` |
| `Webhook` | `id`, `userId`, `url`, `secret`, `events[]`, `isActive` |

Auth.js session tables (`Account`, `Session`, `VerificationToken`) exist for adapter compatibility. `Session` is unused because sessions are JWT-based.

**Indexes**:
- `Check(monitorId, checkedAt)` — general check reads
- `Monitor(userId)`, `Monitor(nextCheckAt)` — cron scan and per-user queries

All user-owned rows cascade-delete when a `User` is deleted.

---

## Security

- Passwords hashed with bcrypt (cost 10). Plaintext never stored.
- Sessions are signed JWTs, not database sessions.
- Cron endpoint protected by `Authorization: Bearer <CRON_SECRET>`. Wrong / missing header → 401.
- Every webhook payload HMAC-SHA256 signed with a per-webhook secret shown once at creation.
- All monitor / status-page / webhook mutations scoped to the acting `userId`.
- Public status pages expose only monitors explicitly listed in the page's `monitorIds[]`; no internal fields leak.
- Zod validation on every server action input, with per-field errors surfaced to the UI.

### What is NOT implemented

- **Rate limiting** on sign-in, signup, cron endpoint, or webhook creation. Add before public launch.
- **CSRF protection beyond Auth.js defaults**. Server actions provide some protection; audit before exposing sensitive endpoints.
- **2FA / MFA**.
- **Password reset flow**. Users who forget their password can sign in with magic link and set a new password from the Account page.
- **API tokens** for scripted access.
- **Audit log** of user actions.

---

## Known limitations and tech debt

Honest inventory of MVP shortcomings.

- **Render free web tier: 512MB RAM ceiling** — the app hit this under initial 500-monitor load. Fixed by rewriting `hourlyLatency` and the Monitors page's "latest check per monitor" lookup to aggregate in SQL (`DISTINCT ON` and `GROUP BY`) instead of loading rows into JavaScript. See "Query patterns to avoid" below.
- **Render free tier cold starts** (~30–60s) after idle.
- **Render free Postgres expiration** — replace or upgrade before it hits.
- **cron-job.org scheduler timeout** — bounded work per tick to `take: 50` monitors.
- **No webhook retry queue** — failed delivery is lost.
- **No webhook delivery log** — users cannot see historical delivery attempts.
- **`StatusPage.monitorIds` is `String[]`** rather than a proper join table. Deleted monitors leave stale IDs (filtered at read time).
- **`prisma` CLI is in `dependencies`** instead of `devDependencies`. Slightly bloats the production bundle.
- **Timezone handling in charts uses server locale**, not per-user.
- **No pagination on the Monitors page** — 500 rows render fine after SQL aggregation but pagination would help beyond that.
- **No custom branding on status pages** (no logos, custom domains, or themes).
- **No email alerts** — only webhook delivery.
- **HTTP checks fail on some sites** that block cloud IPs or synthetic monitoring. Documented as roadmap for per-monitor tuning (custom User-Agents, retries) and multi-region checks.

### Query patterns to avoid at scale

- **`prisma.findMany({ include: { children: { take: 1 } } })`** on many parents. Prisma emits `SELECT ... WHERE parentId IN (...) ORDER BY sort DESC` with no `LIMIT`, then filters in JS. This loaded ~150k rows for us. Use `DISTINCT ON` (Postgres) or a windowed query instead.
- **`findMany` followed by JavaScript grouping** for chart aggregations. Use `$queryRaw` with SQL `GROUP BY` and `date_trunc`.

---

## Roadmap

If this continues past MVP, likely next steps in priority order:

1. **Per-monitor custom User-Agent + retry policy** — addresses the WAF false-positive rate
2. **Multi-region check origination** — removes single cloud IP dependency
3. **Webhook retries with exponential backoff and a `WebhookDelivery` model**
4. **Password reset via Resend** (currently deferred; magic-link is the workaround)
5. **Email alerts** on incidents (in addition to webhooks)
6. **Pagination on Monitors page**
7. **Migrate `StatusPage.monitorIds String[]` to a proper join table**
8. **Slack / Discord integrations**
9. **Historical uptime rollups** for faster aggregation at very large scale
10. **Automated tests** — Vitest unit tests on `runMonitorCheck` and integration tests on the auth flows

---

## License

Not currently licensed. All rights reserved to the project author.

---

## Acknowledgements

- [Lucide](https://lucide.dev) — icon set
- [Recharts](https://recharts.org) — charts
- [Auth.js](https://authjs.dev) — auth layer
- [Resend](https://resend.com) — transactional email
- [Render](https://render.com) — hosting
- [cron-job.org](https://cron-job.org) — external scheduler

_MVP prototype._
