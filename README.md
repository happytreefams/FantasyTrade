# Fantasy Trade

A mock stock trading / financial literacy platform, styled as an original
Schwab/Robinhood-inspired dark-mode brokerage app. Users get a simulated
brokerage account (starting cash: $1,000,000.00) to practice investing without
real money — and a built-in learning portal, since the point of this app is
financial literacy, not just a trading toy. Implemented: auth, a responsive
app shell (desktop sidebar / mobile drawer nav), a stocks/ETFs/bonds/commodities
trading engine (market + limit orders), a watchlist, per-security detail pages
with an Analytics section (stats grid, analyst ratings, a period-selectable
price chart), real end-of-day pricing (Alpha Vantage, with a synthetic
fallback), a weekly fundamentals refresh + on-demand price-history backfill,
an overnight portfolio-revaluation job, a dashboard with a performance
chart/allocation donut/top movers, a learning portal (courses, lessons,
quizzes, progress tracking) cross-linked contextually from the trading
screens, a DB-backed feature-flag system, and a role-gated `/admin` stub
(user list, security list, manual daily-close/fundamentals/backfill triggers,
flag toggles). See [ARCHITECTURE.md](ARCHITECTURE.md) for module boundaries,
the daily/weekly jobs, and guides for adding a new asset type or course.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, Turbopack)
- [Tailwind CSS 4](https://tailwindcss.com) (CSS-first config, dark-mode-first design system)
- [PostgreSQL](https://www.postgresql.org) via Docker Compose for local dev
- [Prisma](https://www.prisma.io) ORM (driver-adapter based, `@prisma/adapter-pg`)
- [Auth.js / NextAuth v5](https://authjs.dev) with a Credentials (email + password) provider
- [pnpm](https://pnpm.io) package manager

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable` or `npm i -g pnpm`)
- Docker Desktop (with WSL2 backend on Windows)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — defaults to match `docker-compose.yml`; only change if you're
     pointing at a different Postgres instance.
   - `NEXTAUTH_SECRET` — generate one with `openssl rand -base64 32`.
   - `MARKET_DATA_API_KEY` — a free [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
     key. Used by the daily-close job; the app runs fine without one (it falls
     back to synthetic prices), but you won't get real closes.

3. **Start Postgres**

   ```bash
   docker compose up -d
   ```

4. **Run migrations and seed the database**

   ```bash
   pnpm prisma migrate dev
   pnpm db:seed
   ```

   The seed script populates ~47 well-known stocks, ETFs, bond ETFs, and
   commodity ETFs with one fake closing price each, dated as the most recent
   trading day — run `pnpm job:daily-close` afterward (see below) to replace
   those with real (or synthetic-fallback) EOD prices. It also seeds the full
   learning portal (8 courses, ~26 lessons, ~104 quiz questions).

5. **Start the dev server**

   ```bash
   pnpm dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected to
   `/login`. Use "Sign up" to create an account (this also provisions your
   brokerage account with a $1,000,000.00 starting balance), then log in and
   you'll land on the empty `/dashboard`.

## Architecture overview

```
src/
  app/
    (auth)/           Centered, nav-less layout for /login and /signup
    (app)/             Authenticated shell: responsive sidebar/drawer nav +
                       header, wraps every feature route (dashboard, portfolio,
                       trade, watchlist, security/[symbol], learn, settings).
                       Each data-heavy route has a loading.tsx skeleton; a
                       shared not-found.tsx covers unknown routes/symbols.
      learn/            Course catalog, course detail, lesson reader
        [courseId]/       (/learn/[courseId]), and quiz UI
        lessons/[lessonId]/  (/learn/quizzes/[quizId]) — see below
        quizzes/[quizId]/
      admin/            Role-gated admin stub — user list, security list +
                        add-security form, feature-flag toggles, manual
                        daily-close trigger (see ARCHITECTURE.md)
    api/
      auth/[...nextauth]/  NextAuth route handler
      signup/              Credentials signup endpoint (hashes password, creates
                            User + Account rows)
      securities/search/    Symbol/name search, annotated with each result's
                            latest close + whether it's on the user's watchlist
      trade/                POST endpoint that executes an order via /lib/trading
      watchlist/            POST/DELETE endpoints to star/unstar a security
      learn/progress/        POST — mark a lesson complete
      learn/quiz-attempts/    POST — record a quiz score
      admin/daily-close/      POST — manually triggers the overnight job
      admin/weekly-fundamentals/  POST — manually triggers the fundamentals refresh
      admin/backfill-history/     POST — manually triggers a bulk price-history backfill
      admin/feature-flags/    POST — toggle a feature flag
      admin/securities/       POST — add a new security (auto-backfills its price history)
  components/          Shared UI: sidebar/mobile-nav, header, sign-out button,
                        toast provider, star button, order form (shared by the
                        Trade ticket and the security detail page), positions
                        table (asset-type tabs), line chart (performance +
                        price history), allocation donut, quick-trade card,
                        skeleton, markdown-content (lesson body renderer),
                        lesson-actions (mark complete / take quiz), quiz-runner
    admin/                Admin page's client widgets: daily-close/fundamentals/
                        backfill trigger buttons, feature-flag toggle switch,
                        add-security form
    analytics-section.tsx  Security detail page's Analytics: period-selectable
                        price chart (reuses line-chart.tsx), stats grid,
                        analyst rating breakdown
  lib/
    auth.ts             Full NextAuth config (Credentials provider + Prisma
                        adapter) — server-only, not Edge-safe
    auth.config.ts       Edge-safe subset of the NextAuth config (no Prisma
                        import) used by middleware for session checks; also
                        copies `isAdmin` onto the session JWT
    current-account.ts   Server-only helper: resolves the signed-in user's Account
    prisma.ts            Prisma Client singleton (via the `pg` driver adapter)
    format.ts             Shared currency/percent/share/date formatting helpers
    market-data/          Security search, latest-close/price-history lookups,
                        updateAllClosingPrices, updateAllFundamentals, and
                        backfillPriceHistory — see ARCHITECTURE.md for the
                        calendar.ts / providers/ split
    trading/              Order execution: validation, cost-basis math, market
                        fills, and limit-order queue/resolution (see below)
    portfolio/            Position, order-history, value-history, and
                        top-movers aggregation for the Portfolio/Dashboard pages
    watchlist/            Star/unstar a security; starred list with last close
                        and day change
    learning/              Course/lesson/quiz queries, progress + quiz-attempt
                        recording, and the dashboard's progress stats (see below)
      links.ts             Just the stable cross-link IDs, safe to import from
                        Client Components (no Prisma import) — see below
    feature-flags/         DB-backed flag definitions + read/write — see
                        ARCHITECTURE.md
    admin/                 requireAdmin() gate + user/security listing and
                        security creation for the /admin page
    daily-close/            Shares the overnight job's 3-step orchestration
                        between the CLI script and the admin trigger route
  middleware.ts          Redirects unauthenticated requests to /login (and signed-in
                        users away from /login, /signup); also redirects
                        non-admins away from /admin
  types/next-auth.d.ts   Session/JWT type augmentation (adds `user.id`, `user.isAdmin`)
prisma/
  schema.prisma          User (incl. isAdmin), Account (brokerage), Auth.js
                        tables, the trading models (Security, PriceHistory,
                        Position, Order, AccountValueHistory, WatchlistItem),
                        the learning models (Course, Lesson, Quiz,
                        QuizQuestion, UserProgress, UserQuizAttempt), and
                        FeatureFlag
  seed.ts                 Seeds ~47 securities with one fake closing price each
                        (dated as the most recent trading day), the full
                        learning-portal content from seed-learning.ts, and the
                        feature-flag definitions (defaulted off)
  seed-learning.ts         All course/lesson/quiz content — see "Learning
                        portal" below for why this doubles as the CMS
scripts/
  daily-close.ts          The overnight valuation job's CLI entry point (see
                        below) — thin wrapper around lib/daily-close
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the pricing-provider abstraction,
the feature-flag system, the admin dashboard, the full schema by domain, and
guides for adding a new asset type or course.

### Trading engine

`placeOrder` in [src/lib/trading/index.ts](src/lib/trading/index.ts) is the
only way orders get executed:

- Trades fill at the **most recent `PriceHistory` row** for that security —
  never a live quote. This is a deliberate T+1-style lag, not a stand-in for
  real-time pricing.
- BUY orders are rejected if `cashBalance` can't cover the order; SELL orders
  are rejected if the account doesn't hold enough shares. Rejected orders are
  still written to `Order` with `status: REJECTED` — the audit trail includes
  every attempt, not just fills.
- A fill updates `Position` (weighted-average cost basis across lots) and
  `Account.cashBalance` and inserts the `Order` row inside one
  `prisma.$transaction`, so a crash mid-trade can't leave cash and position
  out of sync.
- `placeOrder(input, client)` takes the Prisma client as a parameter (defaulting
  to the shared singleton) specifically so tests can pass in a lightweight fake
  — see [src/lib/trading/index.test.ts](src/lib/trading/index.test.ts).

**Limit orders** are the other order type (`orderType: "LIMIT"`). Placing one
just writes an `Order` row with `status: PENDING` and a `limitPrice` — no
cash/position change yet, since there's no live quote to fill against in this
T+1 design. `processPendingLimitOrders` (called by the daily-close job right
after prices refresh) resolves each PENDING order against the new close:
BUY fills if close ≤ limit, SELL fills if close ≥ limit; otherwise it expires
untouched. A fill reuses the exact same `applyBuy`/`applySell` cash/position
logic as a market order — if the condition is met but cash/shares no longer
suffice (e.g. spent on other trades since), it's rejected rather than forced
through, so the "never let cash go negative" invariant holds even here.

### Market data & the daily-close job

`src/lib/daily-close/index.ts` exports `runDailyClose()`, shared by
`scripts/daily-close.ts` (`pnpm job:daily-close` — what a nightly cron would
run in a real deployment) and the `/admin` page's manual trigger button. It:

1. Computes the most recent US-market trading day before today
   (`previousTradingDay()` in [src/lib/market-data/calendar.ts](src/lib/market-data/calendar.ts) —
   a simple weekend + fixed/floating-holiday check, not a full NYSE calendar).
2. For every `Security`, asks the active `MarketDataProvider`
   (`src/lib/market-data/providers/` — Alpha Vantage's free `TIME_SERIES_DAILY`
   endpoint today) for that day's close. Calls are spaced ~13s apart and
   capped at 25 per run (Alpha Vantage's free tier is ~5 req/min, ~25/day —
   scaling past that needs a paid tier; override the cap with
   `MARKET_DATA_MAX_DAILY_CALLS` for local testing). See
   [ARCHITECTURE.md](ARCHITECTURE.md) for how to swap in a different provider.
3. Whatever the provider can't supply — rate limited, over the daily cap, bad
   symbol, missing key, network failure — gets a **synthetic price** instead:
   a small ±2% random walk off the security's last known close. The app never
   blocks on the market data provider being unavailable.
4. Upserts every result into `PriceHistory`, resolves pending limit orders
   against the new closes, then recomputes and snapshots every account's
   total portfolio value into `AccountValueHistory` for that date — this is
   what powers the dashboard's performance chart.

Run it manually in local dev:

```bash
pnpm job:daily-close
```

Or trigger it on demand from `/admin` (admin users only) without shell
access.

**Seed/job date consistency matters**: `prisma/seed.ts` stamps its fake prices
using the same `previousTradingDay()` helper (not literal "today"), and its
`PriceHistory` upsert never overwrites a price the job already wrote. Get this
wrong — e.g. seed stamping "today" while the job stamps "yesterday" — and the
seed's fake row silently outranks the job's real one forever, since
`getLatestPrice` just takes the max date.

### Learning portal

8 courses (`prisma/seed-learning.ts`), grouped into 7 categories, ~3-4 short
lessons each, every lesson ending in a 4-question quiz — covering stocks,
ETFs, bonds, commodities, risk/diversification, reading your own portfolio
(cost basis, market value, P/L), order types, and how this app's T+1 pricing
relates to real markets.

- **Content authoring is the seed script itself** — there's no CMS or admin
  UI yet. Add or edit a course/lesson/quiz by editing the `COURSES` array in
  `prisma/seed-learning.ts` and re-running `pnpm db:seed`; every write there
  is an upsert keyed by a stable, hand-assigned ID (e.g. `course-stocks`,
  `course-stocks-l1`), so re-seeding updates existing rows instead of
  duplicating them.
- **Why IDs are hand-assigned instead of `cuid()`-generated**: app code
  cross-links to specific content (the trade ticket's "What's a limit order?"
  link, the security page's "New to ETFs?" nudge) by ID. `LEARNING_LINKS` in
  `prisma/seed-learning.ts` — re-exported from `src/lib/learning/links.ts`,
  which has zero Prisma/server-only imports so it's safe to import from
  Client Components — is the single source of truth those call sites read
  from, instead of a fragile lookup by title.
- **Quiz grading is entirely client-side**: the lesson/quiz page fetches the
  quiz's questions *with* `correctAnswerIndex` and `explanation` already
  attached (there's no adversarial "don't leak the answer" concern for a
  self-paced trivia quiz), so per-question feedback is instant with no
  round-trip. Only the final score gets POSTed to `/api/learn/quiz-attempts`
  once the quiz is complete.
- **The "New to ETFs?" nudge** (and its stock/bond/commodity equivalents) on
  a security detail page isn't a one-time-per-user flag — it checks whether
  the matching intro course's first lesson is completed yet, so it keeps
  nudging until the user actually engages, not just until they've viewed the
  page once.

### Why `auth.ts` and `auth.config.ts` are split

The Prisma client can't run in the Edge runtime that Next.js middleware uses.
`auth.config.ts` holds everything middleware needs (pages, session strategy,
JWT/session callbacks) with zero Node-only imports. `auth.ts` extends it with
the Credentials provider and Prisma adapter for use in Server Components and
API routes. Middleware only imports `auth.config.ts`.

### Data model

- `User` — id, email, hashedPassword, name, `isAdmin`, createdAt. `isAdmin`
  gates `/admin` (see below); there's no separate roles table.
- `Account` (mapped to `trading_accounts`) — one per user, `cashBalance`
  defaults to 1,000,000.00. This is the simulated brokerage account; it holds
  no positions yet.
- `AuthAccount` / `Session` / `VerificationToken` — the standard Auth.js Prisma
  adapter tables (renamed `AuthAccount` to avoid colliding with the brokerage
  `Account` model above).
- `Security` — a tradable stock, ETF, bond, or commodity (symbol, name,
  assetType, exchange). Bonds and commodities are represented via ETF proxies
  (e.g. `TLT`, `GLD`) so they share the same EOD pricing pipeline.
- `PriceHistory` — one row per security per trading day; unique on
  `(securityId, date)`. Trades execute against the latest row only.
- `Position` — current holdings per `(accountId, securityId)`; quantity +
  weighted-average cost basis.
- `Order` — immutable trade/audit log, including rejected attempts.
- `AccountValueHistory` — one snapshot per account per trading day
  (`accountId`, `date`, `totalValue`), written by the daily-close job. Powers
  the dashboard's performance chart and day-over-day change.
- `WatchlistItem` — a starred `(accountId, securityId)` pair.
- `Course` / `Lesson` / `Quiz` / `QuizQuestion` — learning-portal content;
  `QuizQuestion.choices` is a JSON string array, `correctAnswerIndex` indexes
  into it. All four use hand-assigned IDs (see "Learning portal" above).
- `UserProgress` — one row per completed `(userId, lessonId)`.
- `UserQuizAttempt` — one row per quiz attempt (retakes are additional rows,
  not overwrites), `score` as a 0-100 percentage.
- `FeatureFlag` — `key` (primary key), `enabled`, `description`. Seeded off by
  default from `FEATURE_FLAG_DEFINITIONS` in `src/lib/feature-flags/index.ts`;
  toggled at runtime from `/admin`. See [ARCHITECTURE.md](ARCHITECTURE.md).

`Order` also carries `orderType` (`MARKET` default or `LIMIT`) and `limitPrice`
(set only for limit orders); `priceAtExecution` is nullable since a `PENDING`
limit order hasn't executed yet.

### Design system notes

- **Two accent shades, one role each.** `--color-accent` (light blue) is for
  text/links/focus rings on dark surfaces; `--color-accent-solid` (darker) is
  for filled button backgrounds. They can't share one value — the shade light
  enough to read as text on a near-black background isn't dark enough for
  white button text to clear 4.5:1 contrast, and vice versa. Both were picked
  by computing actual WCAG contrast ratios, not eyeballed.
- **Chart categorical colors** (`--color-chart-1..5`, used by the dashboard's
  allocation donut) intentionally skip the hue slots already carrying
  positive/negative meaning elsewhere in the app, so a category color never
  gets misread as a gain/loss signal.

## Scripts

| Command                | Description                              |
| ----------------------- | ----------------------------------------- |
| `pnpm dev`              | Start the Next.js dev server              |
| `pnpm build`            | Production build                         |
| `pnpm start`            | Run the production build                 |
| `pnpm lint`             | ESLint                                   |
| `pnpm test`             | Run the test suite (vitest) once — includes the real-database integration suite (`src/test/integration/`), so a running Postgres is required |
| `pnpm test:watch`       | Run the test suite in watch mode          |
| `pnpm prisma migrate dev` (`pnpm db:migrate`) | Apply schema changes locally |
| `pnpm db:seed`          | Re-seed securities + a baseline closing price |
| `pnpm job:daily-close`  | Run the overnight valuation job (real/synthetic EOD prices + account snapshots) |
| `pnpm job:weekly-fundamentals` | Refresh market cap, valuation ratios, and analyst ratings (SecurityFundamentals) |
| `pnpm db:studio`        | Open Prisma Studio                        |
