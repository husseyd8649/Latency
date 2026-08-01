# Latency

> Uptime monitoring built for solo developers and small teams. HTTP, TCP and SSL checks with public status pages and HMAC-signed webhooks.

![Status](https://img.shields.io/badge/status-MVP-orange)
![Stack](https://img.shields.io/badge/stack-Next.js%2016-black)
![Auth](https://img.shields.io/badge/auth-Auth.js%20v5-blue)
![DB](https://img.shields.io/badge/db-PostgreSQL-336791)

Latency is a focused, opinionated uptime monitor. Add a URL, hostname or port; we check it on a schedule you choose; you get a live dashboard, a public status page and signed webhooks when something changes.

Built as an MVP prototype end-to-end in a series of guided phases.

---

## Table of contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Cron setup](#cron-setup)
- [Webhook payload](#webhook-payload)
- [Data model](#data-model)
- [Security](#security)
- [Known limitations and tech debt](#known-limitations-and-tech-debt)
- [Roadmap](#roadmap)
- [License](#license)

---

## Screenshots

> Add real screenshots here once you have them. Suggested captures:
>
> - Landing page (dark + light)
> - Dashboard overview
> - Monitors table with sparklines
> - Public status page at `/s/<slug>`
> - Webhooks page with test button

---

## Features

- **HTTP, TCP and SSL monitoring** — one tool for endpoints, ports, and TLS certificate expiry
- **Configurable intervals** from 1 minute to 24 hours per monitor
- **Real-time incident tracking** — automatic incident open on UP→DOWN, auto-resolve on DOWN→UP
- **Public status pages** — shareable pages at `/s/<slug>` with 30-day uptime bars
- **HMAC-SHA256 signed webhooks** — verifiable delivery to your own endpoints
- **Email + password auth** and **magic-link auth** via Resend
- **Dark + light theme** with warm cream + coral palette
- **"Run now" and "Simulate incident"** for demos and quick verification
- **Zero-config setup** — sign up, add a URL, monitoring starts immediately

---

## Tech stack

| Layer          | Choice                                     |
| -------------- | ------------------------------------------ |
| Framework      | Next.js 16 (App Router)                    |
| UI runtime     | React 19                                   |
| Language       | TypeScript 5                               |
| Styling        | Tailwind CSS v4 (CSS-based config)         |
| UI primitives  | Custom components + Lucide icons           |
| Charts         | Recharts                                   |
| Auth           | Auth.js v5 (JWT sessions)                  |
| Password hash  | bcryptjs                                   |
| Email          | Resend                                     |
| Database       | PostgreSQL                                 |
| ORM            | Prisma 6                                   |
| Validation     | Zod                                        |
| Theming        | `next-themes`                              |
| Hosting        | Render (web + Postgres)                    |
| Scheduler      | cron-job.org (external)                    |

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

See the in-app **Architecture** page (`/dashboard/architecture`) for the same information with code snippets.

---

## Local development

### Prerequisites

- Node.js 20+
- npm 10+
- A PostgreSQL database (local, or hosted free tier from Neon, Supabase, or Render)
- A Resend account (free) for email delivery

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/latency.git
cd latency
npm install
cp .env.example .env
# Edit .env with your values (see Environment variables below)
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

Checks don't run automatically in dev. Trigger them one of two ways:

- Click **Run now** (lightning icon) on any monitor row in the dashboard
- Call the cron endpoint manually:

```bash
curl -X POST http://localhost:3000/api/cron/run-checks \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Windows PowerShell users: prefix with `curl.exe` (not the PowerShell alias).

---

## Environment variables

All variables are required unless noted.

| Variable           | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `DATABASE_URL`     | Postgres connection string (use Render's Internal URL in prod)   |
| `AUTH_SECRET`      | Auth.js JWT signing secret (32+ random bytes, base64)            |
| `AUTH_URL`         | Fully-qualified site URL (e.g. `https://latency-abc.onrender.com`) |
| `AUTH_TRUST_HOST`  | Set to `true` on non-Vercel hosts (Render, Fly, etc.)            |
| `RESEND_API_KEY`   | Resend API key for magic-link email                              |
| `EMAIL_FROM`       | Sender address (use `onboarding@resend.dev` on free tier)        |
| `CRON_SECRET`      | Bearer token protecting `/api/cron/run-checks` (32+ random bytes)|

Generate `AUTH_SECRET` and `CRON_SECRET`:

```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Never commit `.env`.** `.env.example` is the tracked template.

---

## Deployment

Latency is designed to run as a single Next.js web service plus a Postgres database. It runs cleanly on Render's free tier.

### Deploy to Render

1. Push this repo to GitHub
2. In Render, create a **Blueprint** and select this repo — the included `render.yaml` will define the web service
3. Fill in the prompted secret values:
   - `DATABASE_URL` — Internal URL from your Render Postgres
   - `AUTH_SECRET` — generated with `openssl rand -base64 32`
   - `AUTH_URL` — a placeholder like `https://placeholder.onrender.com` for now
   - `RESEND_API_KEY` — your Resend API key
   - `CRON_SECRET` — generated the same way as `AUTH_SECRET`
4. Deploy. Once you have the real `<name>.onrender.com` URL, edit `AUTH_URL` to match and redeploy.

### Notes

- The `postinstall` script runs `prisma generate`. The `build` script runs `prisma migrate deploy && next build`. Migrations apply automatically on every deploy.
- On the Render free tier, the web service **sleeps after ~15 min idle** and cold-starts on next request (~30-60s). Acceptable for a demo, not for production.
- Render's free Postgres tier may expire after 90 days. Set a calendar reminder.

---

## Cron setup

Latency does not include a built-in scheduler. Checks are triggered externally.

### Using cron-job.org (free)

1. Sign up at https://cron-job.org
2. Create a new cron job:
   - **URL**: `https://<your-site>.onrender.com/api/cron/run-checks`
   - **Schedule**: every 1 minute
   - **Request method**: `POST`
   - **Advanced → Headers**: add `Authorization: Bearer <YOUR_CRON_SECRET>`
3. Save and enable

The endpoint returns JSON: `{ "ok": true, "checked": N, "durationMs": XXX }`.

### Alternative schedulers

Any HTTP-based scheduler works: GitHub Actions cron, Upstash QStash, EasyCron, or your own machine's `cron`.

---

## Webhook payload

Every incident state change fires an HTTP POST to your subscribed webhooks.

### Headers

| Header                 | Value example                        |
| ---------------------- | ------------------------------------ |
| `Content-Type`         | `application/json`                   |
| `X-Latency-Event`      | `incident.started` or `incident.resolved` |
| `X-Latency-Signature`  | `sha256=<hex_hmac>`                  |
| `X-Latency-Delivery`   | `<uuid v4>`                          |
| `User-Agent`           | `Latency-Webhook/1.0`                |

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

`incident.resolved` events include a populated `resolvedAt`.

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

Use the **raw request body**, not the parsed JSON. Reject payloads with a `deliveredAt` older than 5 minutes for basic replay protection.

---

## Data model

Simplified schema (see `prisma/schema.prisma` for the source of truth).

| Model         | Key fields                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| `User`        | `id`, `email`, `passwordHash?`, `name?`, `createdAt`                                    |
| `Monitor`     | `id`, `userId`, `name`, `type` (HTTP\|TCP\|SSL), `target`, `intervalSeconds`, `isPaused`, `nextCheckAt` |
| `Check`       | `id`, `monitorId`, `status` (UP\|DOWN), `responseTimeMs?`, `statusCode?`, `error?`, `checkedAt` |
| `Incident`    | `id`, `monitorId`, `startedAt`, `resolvedAt?`, `cause?`                                 |
| `StatusPage`  | `id`, `userId`, `slug` (unique), `title`, `monitorIds[]`                                |
| `Webhook`     | `id`, `userId`, `url`, `secret`, `events[]`, `isActive`                                 |

Auth.js session tables (`Account`, `Session`, `VerificationToken`) also exist but are largely unused since sessions are JWT-based.

---

## Security

- Passwords hashed with bcrypt (cost factor 10). Plaintext is never stored.
- Sessions are signed JWTs, not database sessions.
- The cron endpoint is protected by a Bearer secret. Failed auth returns 401.
- Every webhook payload is HMAC-SHA256 signed with a per-webhook secret shown once at creation.
- All monitor / status-page / webhook mutations are scoped to the acting `userId`.
- Public status pages expose only the monitors explicitly listed; no internal fields leak.
- Passwords validated as `>= 8` characters with at least one letter and one number.

### What is NOT implemented

- **No rate limiting** on sign-in, signup, cron endpoint or webhook creation. Add before public launch.
- **No CSRF protection beyond Auth.js defaults**. Server actions provide some protection, but audit before exposing sensitive endpoints.
- **No 2FA** for account login.
- **No password reset flow**. Users who forget their password must sign in with magic link.
- **No API tokens**. Users cannot script access.
- **No audit log** of who did what and when.

---

## Known limitations and tech debt

Honest inventory of what the MVP does not do well.

- **Render free tier cold starts** (~30-60s) after idle
- **Render free Postgres expires after 90 days** — replace or upgrade before then
- **No webhook retry queue** — if delivery fails, it's lost
- **No webhook delivery log** — users cannot see historical delivery attempts
- **No inline monitor editing** — must delete and recreate to change target
- **No inline status-page editing** — same limitation
- **`prisma` CLI is in `dependencies`** rather than `devDependencies` — slightly bloats the production bundle
- **Timezone handling in charts uses server locale**, not per-user
- **`StatusPage.monitorIds` is a `String[]`** rather than a proper join table — deleted monitors leave stale IDs (filtered at read time, but a schema migration would be cleaner)
- **No monitor tagging / grouping**
- **Status pages have no custom branding** (no logos, custom domains, or themes)
- **No email alerts** — only webhook delivery. Email alerts would be a small addition using Resend.
- **Password reset (forgot-password) flow is deferred**

---

## Roadmap

If this project continues past MVP, likely next steps:

1. **Password reset** via Resend email
2. **Email alerts** on incidents (in addition to webhooks)
3. **Inline editing** for monitors and status pages
4. **Webhook retries** with exponential backoff and a delivery log
5. **Rate limiting** on auth + cron endpoints (Upstash-based)
6. **API tokens** for scripted access
7. **Multiple users per workspace** (teams)
8. **Custom domains** on status pages
9. **Slack / Discord native integrations**
10. **Historical uptime rollups** for faster aggregation at scale

---

## License

Not currently licensed. All rights reserved to the project author.

If you want to publish this as open source, add a `LICENSE` file (MIT is the common choice for a small project) and update this section.

---

## Acknowledgements

- [Lucide](https://lucide.dev) for the icon set
- [Recharts](https://recharts.org) for the charting primitives
- [Auth.js](https://authjs.dev) for the auth layer
- [Resend](https://resend.com) for transactional email
- [Render](https://render.com) for hosting
- [cron-job.org](https://cron-job.org) for the external scheduler

_This project was built as an MVP prototype._
