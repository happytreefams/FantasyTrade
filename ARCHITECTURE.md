# Architecture

This doc is for contributors extending Fantasy Trade, not for setup — see
[README.md](README.md) for that. It covers how the app is put together, why
the boundaries are where they are, and how to add the two kinds of content
this app is built to grow: asset types and courses.

## Module boundaries

Everything under `src/lib/*` is a plain-function service module: no classes,
no DI container, just exported async functions that take a Prisma client as
their last parameter (defaulting to the shared singleton in `src/lib/prisma.ts`).
That's the one convention every module below follows, and it's what makes
`src/lib/trading/index.test.ts` possible — tests pass in a small fake client
instead of hitting a real database.

**UI code (pages, components, API routes) never imports `@prisma/client`
models directly for reads or writes that a `lib` module already covers.** It
imports named functions from `@/lib/*` and works with the types those
functions return. This is what "swapping something out doesn't touch the UI"
actually means in practice: a page like
[src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx) calls
`getPortfolioSummary`, `getLatestPricingDate`, `getTopMovers` — it has no idea
whether those numbers came from Postgres, a cache, or a different pricing API
underneath.

| Module | Responsibility | Exported service interface |
| --- | --- | --- |
| `lib/market-data` | Security search, latest price / price history lookups, the US trading-day calendar, the daily-close price-refresh routine, the weekly fundamentals refresh, and the price-history backfill | `MarketDataService` |
| `lib/market-data/providers` | The pluggable pricing-source contract (see below) | `MarketDataProvider` |
| `lib/trading` | Order validation, market fills, limit-order queue + resolution, cost-basis math | `TradingService` |
| `lib/portfolio` | Read-side aggregation: position summaries, top movers, order history, value-history snapshots | `PortfolioService` |
| `lib/watchlist` | Star/unstar a security, starred list with day change | — (small enough not to need one) |
| `lib/learning` | Course/lesson/quiz queries, progress + quiz-attempt recording | — |
| `lib/feature-flags` | Flag definitions, read/write | `FeatureFlagService` |
| `lib/admin` | Admin-only reads (users, securities) + mutations (add a security), the `requireAdmin` gate | `AdminService` |
| `lib/daily-close` | Orchestrates the three-step overnight job | — |

Each interface (`MarketDataService`, `TradingService`, `PortfolioService`,
`FeatureFlagService`, `AdminService`) is declared as a TypeScript `interface`
at the bottom of its module, listing the functions it promises to keep
exporting. Nothing implements these interfaces explicitly with an `X
implements Y` — they exist purely so the compiler catches an accidental
signature change or removal, and so a future contributor can read one place
to see a module's whole public contract instead of scanning the file.

### The pricing-provider abstraction

This is the one place in the codebase built specifically for a future swap,
because it's the one dependency genuinely likely to change (a paid API, a
real-time upgrade, a crypto feed).

```
src/lib/market-data/
  calendar.ts        US trading-day calendar — no dependencies, pure functions
  providers/
    types.ts          The MarketDataProvider interface + EodQuote/
                      FundamentalsQuote types
    alpha-vantage.ts   The only implementation today
    index.ts           getMarketDataProvider() — the single swap point
  index.ts             Public API: search/lookup functions,
                       updateAllClosingPrices, updateAllFundamentals, and
                       backfillPriceHistory — all calling
                       getMarketDataProvider() rather than any specific
                       provider
```

**To swap or add a pricing source:** write a new file beside
`alpha-vantage.ts` that returns an object matching `MarketDataProvider`
(`{ name, fetchEodClose(symbol), fetchDailyHistory(symbol),
fetchFundamentals(symbol) }`), then change what `getMarketDataProvider()` in
`providers/index.ts` returns. Nothing in `updateAllClosingPrices`, the
weekly fundamentals job, the backfill routine, the trading engine, or any UI
page needs to change — they only ever call `getLatestPrice`,
`getPriceHistory`, `getFundamentals`, etc., which read from `PriceHistory`/
`SecurityFundamentals` regardless of which provider wrote to them.

A provider must never throw — every method returns `null` on any failure
(rate limit, bad symbol, network error, missing API key). The daily-close
path always has a fallback: a synthetic ±2% random-walk price off the last
known close, so the simulation never blocks on an external API being
unavailable. Fundamentals and history backfill have no synthetic fallback —
a security the provider doesn't cover just shows "unavailable" or "limited
history" in the UI (see the Analytics section below) rather than inventing
numbers.

## The daily-close job

`src/lib/daily-close/index.ts` exports `runDailyClose()`, the overnight
valuation routine in three steps:

1. **Refresh prices** — `updateAllClosingPrices()` (`lib/market-data`) walks
   every `Security`, asks the active `MarketDataProvider` for a close, and
   falls back to a synthetic price for anything the provider can't supply.
   Calls are paced (13s apart, 25/run by default) to respect Alpha Vantage's
   free-tier limits.
2. **Resolve limit orders** — `processPendingLimitOrders()` (`lib/trading`)
   checks every `PENDING` limit order against the fresh closes: fills if the
   limit condition is met (re-validating funds/shares first — rejects rather
   than forcing a fill if they no longer suffice), otherwise expires it.
3. **Snapshot accounts** — for every `Account`, `getPortfolioSummary()` +
   `recordAccountValueSnapshot()` (`lib/portfolio`) write today's total value
   to `AccountValueHistory`, which is what the dashboard's performance chart
   reads.

Two callers share this exact function, so there's only one implementation of
"what a day's close does":

- `scripts/daily-close.ts` — the CLI entry point (`pnpm job:daily-close`),
  what a real nightly cron would invoke.
- `POST /api/admin/daily-close` — the manual trigger button on `/admin`, for
  testing or catching up without shell access.

## Fundamentals refresh and price-history backfill

Two more jobs sit alongside the daily-close job, both in `lib/market-data`
and both rate-limited the same way (paced calls, a per-run budget) since
they hit the same free-tier API:

- **Weekly fundamentals** (`updateAllFundamentals`) — market cap, 52-week
  high/low, dividend yield, P/E ratio, and analyst target/ratings change
  slowly enough that refreshing them daily would waste the API budget on no
  new information. Writes to `SecurityFundamentals` (one row per security,
  every stat nullable). Run via `pnpm job:weekly-fundamentals` or the
  "Refresh fundamentals now" button on `/admin`. Unlike the price job, there
  is no synthetic fallback — a security the provider doesn't cover keeps
  whatever it already has (or nothing), and the Analytics section on
  `/security/[symbol]` renders that as "Unavailable" per field rather than a
  fake number.
- **Price-history backfill** (`backfillPriceHistory` / `backfillAllPriceHistory`)
  — the daily job only ever writes one row (today's close) per security, so
  a brand-new security starts with almost no chart data. `backfillPriceHistory`
  pulls a provider's full daily-close history in one call and stores it
  (`skipDuplicates` so it never clobbers a price the daily job already wrote).
  New securities added via `/admin` are backfilled automatically on creation;
  `backfillAllPriceHistory` (the "Backfill all price history" button) is the
  on-demand bulk catch-up for securities that predate this feature.

## Analytics section

`/security/[symbol]` renders `AnalyticsSection`
([src/components/analytics-section.tsx](src/components/analytics-section.tsx)),
a client component fed by the page's server-side data fetch — `getPriceHistory`
(a generous window, ~7 years of trading days) and `getFundamentals`. Decimal/
BigInt fields are converted to strings before crossing the Server→Client
Component boundary, since neither type serializes across it.

- **Period selector** (1D/5D/1M/6M/YTD/1Y/5Y) filters the already-fetched
  price array client-side by date — no extra round trip per click. 1D is a
  special case: this app only stores end-of-day closes, so "1D" shows the
  last two closes as a two-point comparison with an explicit "intraday data
  not available" label rather than fabricating an intraday line. Any period
  reaching further back than the security's actual history shows a "Limited
  history available" note instead of silently truncating the requested range.
- **Stats grid and analyst ratings** read straight off the `SecurityFundamentals`
  row; a null field (or no row at all) renders "Unavailable" rather than
  omitting the stat or showing a zero. The consensus label is a weighted
  average across the five rating buckets (5 = Strong Buy .. 1 = Strong Sell).

## Feature flags

`src/lib/feature-flags/index.ts` backs flags with a `FeatureFlag` table
(`key`, `enabled`, `description`) rather than env vars, so they can be
flipped at runtime from `/admin` without a redeploy. `isFeatureEnabled(key)`
defaults to `false` for any key that's never been seeded or toggled — a typo
in a flag key fails closed, not open.

**To add a new flag:**

1. Add one entry to `FEATURE_FLAG_DEFINITIONS` in `src/lib/feature-flags/index.ts`
   (key + one-line description). It'll show up in `/admin` and get seeded
   (off) the next time `pnpm db:seed` runs.
2. Inside the feature's own code, call `await isFeatureEnabled("your_key")`
   wherever it needs to gate on being enabled — a page component, an API
   route, a background job step.

No other module needs to know the flag exists.

## Admin dashboard

`/admin` (role-gated) is a stub: enough to operate the app day-to-day, not a
back office. It's built from three layers:

- **`User.role`** (schema) — a `Role` enum (`STUDENT`/`TEACHER`/`ADMIN`), one
  column, no separate roles table. Originally a plain `isAdmin` boolean
  (Tier 5); replaced with the enum in Tier 10 so TEACHER could be added
  without a second flag living alongside it — see "Classroom mode" below for
  how a user becomes a TEACHER.
- **Middleware gate** — `src/middleware.ts` redirects any `/admin/*` request
  away to `/dashboard` unless `req.auth.user.role === "ADMIN"`. That claim
  rides in the session JWT (see `src/lib/auth.config.ts`'s `jwt`/`session`
  callbacks), refreshed at sign-in — a role change (e.g. becoming a TEACHER)
  won't be reflected in the session until the next login. The same file also
  redirects `/teacher/*` (but deliberately not bare `/teacher` — see below)
  away from non-TEACHER/ADMIN sessions.
- **`requireAdmin()`** (`src/lib/admin/index.ts`) — defense in depth for the
  API routes underneath the page: re-checks `role` against the database
  (not just the cached JWT claim, which can go stale between sign-ins)
  before any admin mutation runs. `requireGroupTeacher()`
  (`src/lib/groups/index.ts`) is the analogous per-resource check for
  classrooms — it isn't enough to hold the TEACHER role, the caller must
  specifically teach the group being accessed.

Today's page shows: a user list, a security list (+ a form to add one), the
feature-flag toggle list, the manual daily-close trigger, and a form to
create open/global trading challenges. There's no security editing/deletion,
no per-user account actions, and no audit log yet — see the roadmap below.

## Classroom mode

A `Group` is a teacher's classroom: `joinCode` (unique, shareable),
`startingCash` (overridable at creation, defaults to the platform's normal
$1,000,000), and a `teacherId`. There's no separate "become a teacher" flow
or admin approval step — creating a group (`createGroup` in
`src/lib/groups/index.ts`) is itself what promotes a `STUDENT` to `TEACHER`
(never downgrades an `ADMIN`). This is why `/teacher` (the index, no
`groupId`) is intentionally left open to every signed-in user in
`middleware.ts` — a student needs to reach it to create their first
classroom — while `/teacher/[groupId]` requires the TEACHER/ADMIN role *and*
(via `requireGroupTeacher`) actually teaching that specific group.

Students join via `Account.groupId`, set during signup or from Settings
(`joinGroup`). If the joining account hasn't traded yet and is still at the
platform default balance, its `cashBalance` is reset to the group's
`startingCash`; an account that already has trading history keeps its
existing balance instead of being silently overwritten. The teacher roster
(`getGroupRoster`) computes each student's % return against the group's
`startingCash` as the baseline — which is *not* correct for a student who
joined with pre-existing balance/trades, a known simplification of the same
kind as the challenges baseline below.

## Trading challenges: baseline-snapshot design

`Challenge` (global if `groupId` is null, otherwise scoped to one classroom)
and `ChallengeParticipant` (`accountId`, `baselineValue`, `joinedAt`) power
`/challenges`. Joining a challenge (`joinChallenge` in
`src/lib/challenges/index.ts`) snapshots the account's current total
portfolio value as `baselineValue`; standings (`getChallengeStandings`) rank
participants by % change from that snapshot to their *current* value.

**This is deliberately not an isolated challenge portfolio.** It's the same
brokerage `Account` a participant uses for all of their regular trading —
there's no per-challenge sub-ledger. Concretely:

- A user's ordinary trading (buys/sells unrelated to the challenge) during
  the challenge window moves their challenge standing exactly as much as
  challenge-motivated trades do — there's no way to distinguish the two.
- A user in two simultaneous challenges has both standings driven by the
  same single account balance; one profitable trade helps both, one loss
  hurts both.
- Leaving/never touching the account after joining still counts as
  "participating" at whatever return the account happens to drift to.

Building true isolated challenge portfolios would need the multi-account-
per-user feature noted in the roadmap below (a real sub-ledger: its own
cash balance, positions, and orders, walled off from the user's main
account) — out of scope for this tier. If that's ever needed, the natural
seam is `PlaceOrderInput`'s `accountId` in `src/lib/trading/index.ts`: today
it always resolves to a user's one-and-only `Account` via `requireAccount()`,
and would need a way to target a challenge-specific account instead.

## Schema overview

Grouped by domain (see `prisma/schema.prisma` for the authoritative version):

**Identity & auth** — `User` (`role` enum, `displayName` for opt-in public
leaderboard visibility, login-streak fields), `Account` (mapped to
`trading_accounts`; the brokerage account, one per user, `cashBalance`
starts at $1,000,000, `isPublicOnLeaderboard` opt-in, nullable `groupId`),
`AuthAccount`/`Session`/`VerificationToken` (Auth.js adapter tables).

**Trading** — `Security` (symbol/name/assetType/exchange — bonds and
commodities are ETF proxies sharing the same pricing pipeline), `PriceHistory`
(one row per security per trading day), `SecurityFundamentals` (market cap,
valuation ratios, analyst ratings — one row per security, every stat
nullable, refreshed weekly), `Position` (current holdings, weighted-average
cost basis), `Order` (immutable audit log, rejections included, `orderType`
MARKET/LIMIT), `AccountValueHistory` (daily snapshots for the performance
chart and the leaderboard's period-return math), `WatchlistItem`.

**Learning** — `Course` / `Lesson` / `Quiz` / `QuizQuestion` (hand-assigned
IDs, authored via `prisma/seed-learning.ts` — see below), `UserProgress`,
`UserQuizAttempt`, `Glossary`, `Certificate`.

**Classroom & competition** — `Group`, `Challenge` / `ChallengeParticipant`
(see the two sections above), `Badge` / `UserBadge` (seeded achievement
definitions and who's earned them — `prisma/seed-badges.ts`).

**Extensibility infrastructure** — `FeatureFlag` (`key`, `enabled`,
`description`).

## How to add a new asset type

The current four (`STOCK`, `ETF`, `BOND`, `COMMODITY`) all share one
`Security` shape and one pricing/execution pipeline. A genuinely different
asset type — **options** or **crypto** from the roadmap below — needs more
than an enum value, since options have strikes/expirations and crypto trades
24/7 (breaking the trading-day calendar assumption). For something that
still fits the existing shape (e.g. another ETF-proxied asset class):

1. Add the value to the `AssetType` enum in `prisma/schema.prisma`, migrate
   (`pnpm db:migrate`).
2. Add securities of that type — either via `prisma/seed.ts`'s `SECURITIES`
   array or the `/admin` "add security" form. No code changes needed for
   search, pricing, or trading: `searchSecurities`, `getLatestPrice`,
   `placeOrder`, `getPortfolioSummary` are all asset-type-agnostic already.
3. If the UI should treat it distinctly (its own label, color, or filter tab),
   update the small `Record<string, ...>` lookup tables that already exist
   per-page for this purpose — e.g. `ASSET_TYPE_LABELS` in
   [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx) and
   [src/app/(app)/security/[symbol]/page.tsx](<src/app/(app)/security/[symbol]/page.tsx>).

For an asset type that needs its own execution model entirely (options,
margin/short positions), don't force it through `placeOrder`. Add a parallel
order-placement path in `lib/trading` (or a new `lib/options` module) that
reuses `weightedAverageCostBasis` and the transactional patterns in
`applyBuy`/`applySell` where they still apply, and gate the feature behind a
flag from `lib/feature-flags` while it's in progress.

## How to add a new course

Course content is authored directly in `prisma/seed-learning.ts` — there's no
CMS. Add a course/lesson/quiz to the `COURSES` array with hand-assigned,
stable IDs (e.g. `course-options-basics`, `course-options-basics-l1`), then
run `pnpm db:seed`; every write is an upsert keyed by that ID, so re-seeding
updates existing content instead of duplicating it. If the new course should
be cross-linked from a trading screen (like the existing "New to ETFs?"
nudges), add its ID to `LEARNING_LINKS` in the same file.

## Roadmap (not built — noted for future contributors)

These are natural next features given the current architecture, deliberately
left undone so this tier stays focused rather than growing new surface area
indefinitely. (Options trading, short selling/margin, crypto, tax-lot
reporting, and social/leaderboards — all previously listed here — have since
been built; see the sections above and `prisma/schema.prisma`.)

- **Multi-account-per-user** — every user has exactly one brokerage
  `Account` today (`Account.userId @unique`). True isolated challenge
  portfolios (see "Trading challenges" above) and any future "practice vs.
  real" account split both need this: a user owning several `Account` rows,
  each with its own cash/positions/orders, with UI to switch between them.
- **Mobile app wrapper**.
- **Real-time pricing upgrade** — swap the `MarketDataProvider` (see above)
  for a streaming/real-time source; would also mean revisiting the T+1 fill
  assumption in `lib/trading`.
- **Cloud deployment** — Dockerized Postgres is local-dev-only today; no
  Dockerfile/deployment config for the Next.js app itself yet.
