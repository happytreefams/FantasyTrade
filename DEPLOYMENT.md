# Deploying Fantasy Trade (Vercel + Neon Postgres)

This covers everything needed to take this codebase to production. Steps
marked **[MANUAL]** happen outside this repo (Neon/Vercel dashboards, DNS) —
everything else is either already wired into the codebase or a command you
run yourself.

## 1. Environment variables

Every variable the app reads is validated at boot by `src/lib/env.ts` (see
`src/instrumentation.ts`) — a missing or malformed required value fails
immediately with a clear message instead of an obscure runtime error three
requests later. The full reference lives in
[.env.production.example](.env.production.example); summary below.

| Variable | Required | Where it comes from |
|---|---|---|
| `DATABASE_URL` | Yes | **[MANUAL]** Neon dashboard → your project → **Connect** → **Pooled connection** (hostname contains `-pooler`). This is what the running app queries through. |
| `DIRECT_URL` | Yes | **[MANUAL]** Same Neon **Connect** panel → **Direct connection** (no `-pooler`). Only `prisma migrate deploy`/`prisma db seed` use this — see §2. |
| `NEXTAUTH_SECRET` | Yes | Generate locally: `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Yes | The final `https://` custom domain, no trailing slash. Must be set to the *real* domain, not the `*.vercel.app` preview URL — wrong/missing value silently breaks sign-in redirects and cookie scoping (see §4 for a way to catch this if it happens). |
| `MARKET_DATA_API_KEY` | No | **[MANUAL]** Free key: https://www.alphavantage.co/support/#api-key. Powers `SecurityFundamentals` (weekly job) and news headlines only (see §3) — without it those features degrade to "unavailable" rather than failing. |
| `MARKET_DATA_MAX_DAILY_CALLS` / `MARKET_DATA_MAX_WEEKLY_CALLS` | No | Only set if you've upgraded past Alpha Vantage's free tier (default cap: 25/day). |
| `TWELVE_DATA_API_KEY` | No | **[MANUAL]** Free key: https://twelvedata.com/pricing. Powers the daily EOD price job for the full S&P 500 universe (see §3) — without it every security falls back to a synthetic random-walk price (see `MarketDataProvider`'s null-on-failure contract), same degrade-gracefully behavior as a missing Alpha Vantage key. |
| `CRON_SECRET` | Yes | Generate locally: `openssl rand -hex 32`. Protects `/api/cron/*` — see §3. |

**[MANUAL]** Set all of the above in Vercel: Project → **Settings** →
**Environment Variables**, scoped to **Production** (and Preview, if you
want cron/seeding to be testable against a preview deploy too — usually not,
since Preview typically shares the same database and you don't want two
environments both trying to run cron jobs against it).

`NODE_ENV`, `VERCEL`, and `VERCEL_URL` are set automatically by Vercel — do
not set these yourself.

## 2. Migrations and the one-time seed

**Migrations run automatically on every deploy** — `package.json`'s `build`
script is `prisma migrate deploy && next build`, so Vercel applies any new
migration before building. `prisma migrate deploy` (unlike `migrate dev`) is
non-interactive and never resets or drops data, so it's safe as an automated
build step. It connects via `DIRECT_URL` (see `prisma.config.ts`) — Neon's
unpooled connection, since Migrate needs a direct session rather than one
routed through PgBouncer's transaction pooling.

**Seeding is NOT automatic** — it's a one-time, manual step you run yourself
after the *first* successful deploy (re-running it later is harmless — every
seed write is an upsert — but there's normally no need to). It populates
~520 securities (the full S&P 500 constituent list — see
`prisma/seed-data/sp500-constituents.json` — plus a handful of index ETFs,
bond/commodity ETF proxies, and crypto from earlier tiers), the full
learning portal (courses/lessons/quizzes), the glossary, badges, and
feature-flag defaults; see `prisma/seed.ts`.

**[MANUAL]** From your local machine, with the Vercel CLI installed and
linked to the project (`vercel link`):

```bash
# Pulls DATABASE_URL/DIRECT_URL/etc. from Vercel's Production env into a
# local file — never commit this file (it's already .gitignored via .env*).
vercel env pull .env.production.local

# Load it and seed against production.
set -a && source .env.production.local && set +a
pnpm db:seed
```

If you don't use the Vercel CLI, export `DATABASE_URL` (and `DIRECT_URL`,
though seeding itself only needs `DATABASE_URL`) from the Neon dashboard
values directly into your shell instead, then run `pnpm db:seed`.

Confirm it worked: `pnpm db:studio` (pointed at the same env) or just load
the deployed site — `/trade` should show ~520 securities (search "Tesla" or
"Nike" to spot-check) and `/learn` the full course catalog.

### 2a. One-time price history backfill

Every newly-seeded S&P 500 constituent gets only a single $100 placeholder
`PriceHistory` row at seed time — real history comes from either the daily
cron (one day at a time, going forward) or, much faster, this one-time
manual backfill. Run it before pointing real users at the app so
`/security/[symbol]` pages and price charts aren't stuck at the placeholder
for weeks.

**[MANUAL]** With the same env loaded as the seed step above:

```bash
pnpm job:backfill-history
```

This pulls full daily history per symbol from Twelve Data (§3's pricing
provider) at a safe pace (one symbol every ~7.5s, matching Twelve Data's
8/minute free-tier cap) and writes it to `PriceHistory` — see
`scripts/backfill-history.ts`. For ~520 symbols this takes roughly an hour;
it logs progress (`(N of 520) SYMBOL — stored X new day(s)`) and is
resumable — symbols that already have >= 250 days on record are skipped
without an API call, so stopping (Ctrl+C) and re-running picks up where it
left off. Deliberately NOT a Vercel cron job — an hour-long run exceeds even
Fluid Compute's 300s ceiling.

## 3. Cron jobs

67 protected routes, defined in [vercel.json](vercel.json):

| Route | What it does | Schedule |
|---|---|---|
| `/api/cron/daily-prices?offset=N&limit=8` | Real EOD price fetch for a batch of 8 securities via Twelve Data (one HTTP call, with synthetic fallback), then pending-order evaluation, dividend posting, margin maintenance, and account snapshotting for **all** accounts (cheap, DB-only — safe to repeat every batch, see the route's doc comment) | 65 staggered entries, 06:00–08:08 UTC (2 min apart) |
| `/api/cron/quarterly-dividends` | Standalone dividend check — a safety net; `daily-prices` already posts dividends as part of its run, and posting is idempotent either way | Daily, 08:15 UTC |
| `/api/cron/weekly-fundamentals` | Market cap / P/E / dividend yield / analyst ratings refresh (Alpha Vantage — unrelated to the Twelve Data price job) | Weekly, Monday 08:25 UTC |

**Pricing provider**: the daily price job uses Twelve Data (see
`src/lib/market-data/providers/twelve-data.ts`), not Alpha Vantage — Alpha
Vantage's ~25 calls/day couldn't cover the full ~520-security S&P 500
universe. Twelve Data's free tier allows 800 requests/day at 8/minute, and
its `time_series` endpoint accepts comma-separated symbols in one HTTP call
(each symbol still costs one request credit, but far fewer round trips per
invocation). Alpha Vantage stays in use for `SecurityFundamentals` and news
(the weekly job, unaffected by this change).

**Why 65 batches of 8, not fewer/larger**: each `limit=8` shard needs
exactly one Twelve Data batch call (8/minute is the entire per-minute
budget in one call) and no inter-chunk sleep, since the whole slice fits in
a single call — done in a few seconds, comfortably inside the 60s duration
every Vercel plan guarantees regardless of whether Fluid Compute is
active. This sizing is deliberately conservative — see "Diagnosed
incident" below for why an earlier, larger sizing (limit=40, needing ~4-5
minutes) caused a real production outage. The daily budget
(`maxApiCallsPerRun`, default 800) is global across all of that day's
batches, not per-batch — see `updateAllClosingPrices`'s doc comment — so
splitting into more, smaller batches doesn't change how many symbols get
real data today, only how long each invocation takes.

**If you add securities beyond the seeded ~520**: the batch
`offset`/`limit` values in `vercel.json` are static. Add another staggered
entry (keep `limit=8`, do not widen it — see the incident writeup below).

**Auth**: Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to
its own scheduled invocations once that env var is set — no further
Vercel-side configuration needed. See `src/lib/cron-auth.ts`. `CRON_SECRET`
is `.trim()`'d in `src/lib/env.ts` specifically to tolerate a trailing
newline/whitespace picked up when pasting a generated value into Vercel's
dashboard — a strict, un-trimmed `===` comparison would otherwise 401 every
invocation with nothing to indicate why.

### Diagnosed incident: prices and portfolio values silently stopped updating

**Symptom**: `PriceHistory` and `AccountValueHistory` stopped getting new
rows in production, with nothing in the app's own logs indicating a
failure — the cron routes appeared to just stop having any effect.

**Root cause**: the original `daily-prices` shard sizing (`limit=40`,
introduced when the pricing provider moved to Twelve Data) needed roughly
4-5 minutes per invocation — 5 Twelve Data batch calls spaced 60s apart —
and was sized on the assumption that Fluid Compute's extended 300s function
duration was active in the deployed Vercel project. That assumption was
never actually confirmed against the project's real settings. If Fluid
wasn't active, Vercel's default 60s ceiling would kill the function
mid-run — during the very first inter-chunk sleep, before `runDailyClose`
ever reached pending-order evaluation, dividend posting, margin
maintenance, or the account value snapshot loop chained after the price
fetch in the same handler. A platform-level duration timeout terminates
the function from outside the route's own `try`/`catch`, so nothing gets
logged and no error surfaces anywhere the app controls — it looks exactly
like "the cron ran (Vercel shows no error) but did nothing," which is
indistinguishable from a silent failure without dedicated observability.

**Fix**: shards were resized to `limit=8` (one Twelve Data batch call per
invocation, no inter-chunk sleep, done in a few seconds) — see "Why 65
batches of 8" above — which removes the dependency on Fluid Compute being
active entirely, rather than trying to reconfirm and rely on that account
setting. `CRON_SECRET` comparison was also hardened against a second,
independently-plausible failure mode found during the same audit — a
trailing-whitespace paste artifact silently breaking every `===` string
comparison (see the Auth paragraph above) — since that failure mode is
cheap to close and can't be ruled out without inspecting the live secret
value.

**Observability added so a future silent failure like this is caught
immediately**: every job invocation (cron, admin-triggered, or CLI) now
writes a `JobRun` row via `@/lib/job-runs` — see §4 and the admin
dashboard's new Job History panel. A run killed mid-execution by a
duration timeout leaves its `JobRun` row with `finishedAt` still null
forever, which the panel surfaces as "never finished" — turning exactly
this failure mode from invisible into immediately visible.

**[MANUAL] — verify these against the actual Vercel project, which this
session cannot inspect directly:**
- **Cron Jobs tab** (Project → **Cron Jobs**) shows all 67 entries, each
  with a schedule and a next-run time. An empty tab means `vercel.json`
  never made it into a **Production** deployment.
- **The deployment is actually Production, not Preview** — Vercel Cron
  Jobs only fire against Production. Check **Deployments** for a
  "Production" label on the current deployment, and promote it
  (**Promote to Production**) if it's only ever been previewed.
- **`CRON_SECRET`'s actual stored value** (Project → **Settings** →
  **Environment Variables**) has no trailing newline or stray whitespace —
  a common artifact of copying `openssl rand -hex 32`'s output. The
  `.trim()` fix above only protects the app's side of the comparison; if
  the *header Vercel sends* was itself malformed by a bad stored value,
  re-paste it clean.
- **Fluid Compute's actual status** on the project (Project → **Settings**
  → **Functions**) — no longer required for correctness after the resize
  above, but worth confirming either way since it affects how much headroom
  `maxDuration = 300` actually buys other routes (the admin manual-trigger
  routes still run the full unbatched universe in one call).

### Triggering a job manually

Two ways:

1. **Admin dashboard** (`/admin`, role-gated to `ADMIN`) — "Run daily close
   now", "Run dividend check now", "Refresh fundamentals now" buttons. These
   call session-authenticated `/api/admin/*` routes that run the *exact
   same* underlying job functions as the cron routes (`runDailyClose`,
   `postQuarterlyDividends`, `updateAllFundamentals`) — just reached via your
   logged-in admin session instead of `CRON_SECRET`, so the secret never
   needs to reach the browser. This is the easiest way to verify a job right
   after deploying, without waiting for the schedule.

2. **Directly, with curl** (useful for confirming the cron route itself,
   headers included, work exactly as Vercel will call them):

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://your-domain.com/api/cron/daily-prices?offset=0&limit=8"

   # or, for a quick manual/browser check:
   curl "https://your-domain.com/api/cron/quarterly-dividends?secret=$CRON_SECRET"
   ```

Every cron route logs a one-line summary (or the full error) to the
console on every run — visible in Vercel's **Deployments → Functions**
logs, or **Observability → Logs** — so a failed run is visible there rather
than failing silently.

## 4. Verifying the deployment is healthy

1. **Hit `/api/health`** — `https://your-domain.com/api/health` should
   return `{"status":"ok","timestamp":"..."}` with a 200. A 503 or a timeout
   means the app can't reach the database — check `DATABASE_URL` first.
   (This route is intentionally public/unauthenticated, for uptime
   monitors — see `middleware.ts`.)

2. **Sign up and sign in** — confirms `NEXTAUTH_SECRET`/`NEXTAUTH_URL` are
   correct. If sign-in redirects to the wrong host or a cookie never sticks,
   `NEXTAUTH_URL` is almost certainly still pointed at the preview URL
   instead of the custom domain.

3. **Trigger a cron job manually** (§3) and then **check a security's
   price updated**: open `/security/AAPL` (or any seeded symbol) before and
   after running `/api/cron/daily-prices`, and confirm the "Prices as of"
   date advances and the price itself changes (real if `TWELVE_DATA_API_KEY`
   is set and within budget, synthetic otherwise — either way the date
   should move). This confirms the full path: cron auth → job execution →
   database write → UI read.

4. **Check the admin dashboard** (`/admin`) loads and its manual triggers
   return a success toast — confirms the `ADMIN` role survived the
   production database (see §2's seed step; the first user you sign up
   won't be an admin automatically — promote one manually, see below).

5. **Check the Job History panel** (`/admin`, same page) after triggering a
   job manually or waiting for the next scheduled run — a `SUCCESS` row for
   `daily-prices` and `portfolio-revaluation` with a plausible
   `symbolsProcessed` count and a duration of a few seconds confirms the
   whole pipeline end to end. Come back the following morning without
   manually triggering anything: seeing fresh `SUCCESS` rows appear on
   their own, at roughly their scheduled times, is the real confirmation
   that the overnight schedule is working unattended — which is the
   specific thing that silently broke before (see the "Diagnosed incident"
   writeup in §3). A row stuck with no `finishedAt`, or a run of `FAILED`/
   `PARTIAL` rows with an `errorMessage`, means something's still wrong —
   check that message first before digging into Vercel's function logs.

**[MANUAL] Promoting the first admin**: there's no UI for this — `Role.ADMIN`
is deliberately kept out of self-serve reach (unlike `TEACHER`, which a user
grants themselves by creating a classroom — see `ARCHITECTURE.md`). After
signing up, run a one-off update against the production database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

(via Neon's SQL editor, or `psql $DATABASE_URL`.)

## Manual steps this session did not and cannot do

- **[MANUAL]** Create the Neon project/database and copy its two connection
  strings.
- **[MANUAL]** Create the Vercel project, connect it to this repo's git
  remote, and set every environment variable from §1 in the dashboard.
- **[MANUAL]** Add the custom domain in Vercel (**Settings → Domains**) and
  create the DNS records your registrar needs (Vercel shows the exact
  A/CNAME records once you add the domain).
- **[MANUAL]** Generate `NEXTAUTH_SECRET` and `CRON_SECRET` and paste them
  into Vercel's env vars (commands above).
- **[MANUAL]** Get a Twelve Data API key, if you want real daily EOD prices
  (§3), and an Alpha Vantage API key, if you want real fundamentals/news.
- **[MANUAL]** Run the one-time production seed (§2) after the first
  successful deploy.
- **[MANUAL]** Run the one-time price history backfill (§2a) — otherwise
  every S&P 500 constituent shows a flat $100 placeholder until the daily
  cron accumulates history one day at a time.
- **[MANUAL]** Promote your own account to `ADMIN` (§4) so the admin
  dashboard and its manual job triggers are reachable.
- **[MANUAL]** After the first deploy, verify the Cron Jobs tab, Production
  promotion status, `CRON_SECRET`'s stored value, and Fluid Compute's
  status against the actual Vercel project — see §3's "Diagnosed incident"
  writeup for exactly what to check and why each one matters.
