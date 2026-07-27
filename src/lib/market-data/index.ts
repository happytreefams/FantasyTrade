import { Prisma, type AssetType, type PrismaClient, type Security, type SecurityFundamentals } from "@prisma/client";

import { withJobRun } from "@/lib/job-runs";
import { prisma as defaultPrisma } from "@/lib/prisma";

import { previousTradingDay } from "./calendar";
import {
  ALPHA_VANTAGE_FREE_TIER_MAX_REQUESTS_PER_DAY,
  ALPHA_VANTAGE_REQUEST_INTERVAL_MS,
} from "./providers/alpha-vantage";
import { getFundamentalsProvider, getPricingProvider, type NewsHeadline } from "./providers";
import {
  TWELVE_DATA_BATCH_SIZE,
  TWELVE_DATA_FREE_TIER_MAX_REQUESTS_PER_DAY,
  TWELVE_DATA_REQUEST_INTERVAL_MS,
  TWELVE_DATA_SINGLE_REQUEST_INTERVAL_MS,
} from "./providers/twelve-data";

export { isTradingDay, isUsMarketHoliday, previousTradingDay } from "./calendar";
export type { EodQuote, MarketDataProvider, NewsHeadline } from "./providers";
export { getFundamentalsProvider, getPricingProvider } from "./providers";

type Client = PrismaClient | Prisma.TransactionClient;

/// Case-insensitive search over symbol/name, optionally scoped to one asset
/// type. An empty query with an assetType lists all securities of that type
/// (browse mode); an empty query with no assetType returns nothing.
export async function searchSecurities(
  query: string,
  limit = 10,
  assetType?: AssetType,
  client: Client = defaultPrisma,
): Promise<Security[]> {
  const trimmed = query.trim();
  if (!trimmed && !assetType) return [];

  return client.security.findMany({
    where: {
      ...(assetType ? { assetType } : {}),
      ...(trimmed
        ? {
            OR: [
              { symbol: { contains: trimmed, mode: "insensitive" } },
              { name: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { symbol: "asc" },
    take: limit,
  });
}

export async function getSecurityBySymbol(
  symbol: string,
  client: Client = defaultPrisma,
): Promise<Security | null> {
  return client.security.findUnique({ where: { symbol: symbol.toUpperCase() } });
}

export type LatestPrice = {
  closePrice: Prisma.Decimal;
  date: Date;
};

/// The most recent close on record for a security — this is the only price
/// trades execute against (T+1 lag by design; no real-time quotes).
export async function getLatestPrice(
  securityId: string,
  client: Client = defaultPrisma,
): Promise<LatestPrice | null> {
  const row = await client.priceHistory.findFirst({
    where: { securityId },
    orderBy: { date: "desc" },
  });

  return row ? { closePrice: row.closePrice, date: row.date } : null;
}

/// The most recent trading-day date for which ANY price has been recorded —
/// used app-wide for the "prices as of [date] close" freshness indicator.
export async function getLatestPricingDate(client: Client = defaultPrisma): Promise<Date | null> {
  const row = await client.priceHistory.findFirst({ orderBy: { date: "desc" } });
  return row?.date ?? null;
}

export type PricePoint = { date: Date; closePrice: Prisma.Decimal };

/// Ascending-by-date closing prices for a security, most recent `days` on
/// record — powers a security detail page's price history chart.
export async function getPriceHistory(
  securityId: string,
  days = 90,
  client: Client = defaultPrisma,
): Promise<PricePoint[]> {
  const rows = await client.priceHistory.findMany({
    where: { securityId },
    orderBy: { date: "desc" },
    take: days,
  });

  return rows.map((row) => ({ date: row.date, closePrice: row.closePrice })).reverse();
}

/// The slow-changing valuation/analyst-rating stats for a security, or null
/// if the weekly fundamentals job has never successfully covered it — the
/// caller (the security detail page's Analytics section) renders that as an
/// "unavailable" state rather than a fake zero.
export async function getFundamentals(
  securityId: string,
  client: Client = defaultPrisma,
): Promise<SecurityFundamentals | null> {
  return client.securityFundamentals.findUnique({ where: { securityId } });
}

/// Fetches recent news headlines for `symbol` live from the active
/// MarketDataProvider — unlike prices/fundamentals, headlines aren't cached
/// in the database (they're only shown once, on the security page, and
/// staleness there doesn't compound the way an un-refreshed price would).
/// Resolves to null on any provider failure (bad symbol, rate limit, missing
/// API key) so the caller can render an empty state.
export async function getNews(symbol: string): Promise<NewsHeadline[] | null> {
  return getFundamentalsProvider().fetchNews(symbol);
}

/// A small random walk off the last known price (+/- 2%), used whenever the
/// active MarketDataProvider can't supply a price. Keeps the simulation
/// moving without ever blocking on external API availability or quota.
export function generateSyntheticPrice(lastPrice: Prisma.Decimal): Prisma.Decimal {
  const maxMovePercent = 2;
  const changePercent = (Math.random() * 2 - 1) * maxMovePercent;
  const factor = new Prisma.Decimal(1).plus(new Prisma.Decimal(changePercent).dividedBy(100));
  const next = lastPrice.times(factor);
  return next.toDecimalPlaces(4);
}

export type PriceUpdateSummary = {
  targetDate: Date;
  fetchedFromApi: string[];
  synthetic: string[];
  skippedOverDailyBudget: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/// The daily-close job's core routine: for every Security, records a
/// PriceHistory row for the most recent trading day, preferring a real quote
/// from the active pricing MarketDataProvider (Twelve Data — see
/// `getPricingProvider`) and falling back to a synthetic price for whatever
/// the provider can't supply (rate limit, bad symbol, outage, or symbols
/// beyond the free-tier daily budget). Swapping providers never touches this
/// function — see `providers/index.ts`.
///
/// `offset`/`limit` restrict the run to one slice of the full (alphabetical,
/// so stable across calls) security list — for splitting the job across
/// several Vercel cron invocations that each stay within a function's
/// duration limit (see `/api/cron/daily-prices`). `maxApiCallsPerRun` is
/// still the GLOBAL daily budget, not a per-batch one: it's compared against
/// each security's position in the FULL list (`offset` + its position in
/// this slice), so a security's real-vs-synthetic outcome only depends on
/// where it falls in the whole day's budget — not on which batch happens to
/// contain it. Every security in every batch still gets a price written
/// (real or synthetic); batching only changes how many can be real today.
///
/// When the provider supports `fetchEodCloseBatch` (Twelve Data does), the
/// slice is chunked into `batchSize`-symbol groups and fetched with one HTTP
/// call per chunk instead of one call per symbol — see
/// `TWELVE_DATA_BATCH_SIZE`'s doc comment for why that's sized to the
/// per-minute credit cap, and why the sleep between chunks (`requestIntervalMs`,
/// defaulting to `TWELVE_DATA_REQUEST_INTERVAL_MS`) is paced per-chunk rather
/// than per-symbol as a result. Providers without batch support fall back to
/// the original one-symbol-per-request loop.
export async function updateAllClosingPrices(options?: {
  client?: PrismaClient;
  maxApiCallsPerRun?: number;
  requestIntervalMs?: number;
  batchSize?: number;
  offset?: number;
  limit?: number;
}): Promise<PriceUpdateSummary> {
  const client = options?.client ?? defaultPrisma;
  const maxApiCallsPerRun = options?.maxApiCallsPerRun ?? TWELVE_DATA_FREE_TIER_MAX_REQUESTS_PER_DAY;
  const requestIntervalMs = options?.requestIntervalMs ?? TWELVE_DATA_REQUEST_INTERVAL_MS;
  const batchSize = options?.batchSize ?? TWELVE_DATA_BATCH_SIZE;
  const offset = options?.offset ?? 0;
  const provider = getPricingProvider();

  const targetDate = previousTradingDay();
  const securities = await client.security.findMany({
    orderBy: { symbol: "asc" },
    skip: offset,
    take: options?.limit,
  });

  const fetchedFromApi: string[] = [];
  const synthetic: string[] = [];
  const skippedOverDailyBudget: string[] = [];

  async function writePriceForSecurity(
    security: Security,
    quote: { date: string; closePrice: number } | null,
  ): Promise<void> {
    let closePrice: Prisma.Decimal;
    if (quote) {
      closePrice = new Prisma.Decimal(quote.closePrice);
      fetchedFromApi.push(security.symbol);
    } else {
      const latest = await getLatestPrice(security.id, client);
      const basePrice = latest?.closePrice ?? new Prisma.Decimal(100);
      closePrice = generateSyntheticPrice(basePrice);
      synthetic.push(security.symbol);
    }

    await client.priceHistory.upsert({
      where: { securityId_date: { securityId: security.id, date: targetDate } },
      update: { closePrice },
      create: { securityId: security.id, date: targetDate, closePrice },
    });
  }

  if (provider.fetchEodCloseBatch) {
    for (let chunkStart = 0; chunkStart < securities.length; chunkStart += batchSize) {
      const chunk = securities.slice(chunkStart, chunkStart + batchSize);
      const withinBudgetChunk = chunk.filter((_, i) => offset + chunkStart + i < maxApiCallsPerRun);
      const overBudgetChunk = chunk.filter((_, i) => offset + chunkStart + i >= maxApiCallsPerRun);
      overBudgetChunk.forEach((security) => skippedOverDailyBudget.push(security.symbol));

      const quotes =
        withinBudgetChunk.length > 0
          ? await provider.fetchEodCloseBatch(withinBudgetChunk.map((security) => security.symbol))
          : {};

      for (const security of withinBudgetChunk) {
        await writePriceForSecurity(security, quotes[security.symbol] ?? null);
      }
      for (const security of overBudgetChunk) {
        await writePriceForSecurity(security, null);
      }

      const isLastChunk = chunkStart + batchSize >= securities.length;
      const isPastGlobalBudget = offset + chunkStart + chunk.length >= maxApiCallsPerRun;
      if (!isLastChunk && !isPastGlobalBudget) {
        await sleep(requestIntervalMs);
      }
    }
  } else {
    for (let localIndex = 0; localIndex < securities.length; localIndex += 1) {
      const security = securities[localIndex];
      const globalIndex = offset + localIndex;
      const withinBudget = globalIndex < maxApiCallsPerRun;

      const quote = withinBudget ? await provider.fetchEodClose(security.symbol) : null;
      if (!withinBudget) skippedOverDailyBudget.push(security.symbol);
      await writePriceForSecurity(security, quote);

      const isLastRequestOfBatch = localIndex === securities.length - 1;
      const isLastRequestOfGlobalBudget = globalIndex === maxApiCallsPerRun - 1;
      if (withinBudget && !isLastRequestOfBatch && !isLastRequestOfGlobalBudget) {
        await sleep(requestIntervalMs);
      }
    }
  }

  return { targetDate, fetchedFromApi, synthetic, skippedOverDailyBudget };
}

export type FundamentalsUpdateSummary = {
  updated: string[];
  unavailable: string[];
  skippedOverWeeklyBudget: string[];
};

/// The weekly fundamentals job's core routine: for every Security, refreshes
/// its SecurityFundamentals row from the active MarketDataProvider. Unlike
/// the daily price job there's no synthetic fallback here — a security the
/// provider doesn't cover (or that's over budget this run) simply keeps
/// whatever fundamentals row it already has (or none), surfaced by the UI as
/// "unavailable" rather than invented. Shares the same rate-limit pacing as
/// `updateAllClosingPrices` since it hits the same free-tier API.
///
/// `offset`/`limit` restrict the run to one slice of the security list, same
/// purpose and global-budget semantics as `updateAllClosingPrices` — see its
/// doc comment. Not needed for the default weekly schedule (one run already
/// fits comfortably within the budget/duration limits, see DEPLOYMENT.md),
/// but available for an admin to target a specific slice on demand.
/// Wraps `updateAllFundamentalsInner` with a "weekly-fundamentals" JobRun
/// (see `@/lib/job-runs`) — covers the cron route, the admin manual
/// trigger, and `pnpm job:weekly-fundamentals` with one implementation.
/// PARTIAL means the run hit its budget before covering the full universe
/// (not itself a failure, but incomplete); "unavailable" symbols don't
/// affect status — many asset types (ETFs, bonds, crypto) simply have no
/// fundamentals coverage, so treating that as a failure would make every
/// run PARTIAL forever.
export async function updateAllFundamentals(options?: {
  client?: PrismaClient;
  maxApiCallsPerRun?: number;
  requestIntervalMs?: number;
  offset?: number;
  limit?: number;
}): Promise<FundamentalsUpdateSummary> {
  return withJobRun(
    "weekly-fundamentals",
    () => updateAllFundamentalsInner(options),
    (summary) => ({
      status: summary.skippedOverWeeklyBudget.length > 0 ? "PARTIAL" : "SUCCESS",
      symbolsProcessed: summary.updated.length + summary.unavailable.length,
    }),
    options?.client,
  );
}

async function updateAllFundamentalsInner(options?: {
  client?: PrismaClient;
  maxApiCallsPerRun?: number;
  requestIntervalMs?: number;
  offset?: number;
  limit?: number;
}): Promise<FundamentalsUpdateSummary> {
  const client = options?.client ?? defaultPrisma;
  const maxApiCallsPerRun = options?.maxApiCallsPerRun ?? ALPHA_VANTAGE_FREE_TIER_MAX_REQUESTS_PER_DAY;
  const requestIntervalMs = options?.requestIntervalMs ?? ALPHA_VANTAGE_REQUEST_INTERVAL_MS;
  const offset = options?.offset ?? 0;
  const provider = getFundamentalsProvider();

  const securities = await client.security.findMany({
    orderBy: { symbol: "asc" },
    skip: offset,
    take: options?.limit,
  });

  const updated: string[] = [];
  const unavailable: string[] = [];
  const skippedOverWeeklyBudget: string[] = [];

  for (let localIndex = 0; localIndex < securities.length; localIndex += 1) {
    const security = securities[localIndex];
    const globalIndex = offset + localIndex;
    const withinBudget = globalIndex < maxApiCallsPerRun;

    if (!withinBudget) {
      skippedOverWeeklyBudget.push(security.symbol);
      continue;
    }

    const overview = await provider.fetchFundamentals(security.symbol);
    if (!overview) {
      unavailable.push(security.symbol);
    } else {
      const data = {
        marketCap: overview.marketCap !== null ? BigInt(overview.marketCap) : null,
        week52High: overview.week52High !== null ? new Prisma.Decimal(overview.week52High) : null,
        week52Low: overview.week52Low !== null ? new Prisma.Decimal(overview.week52Low) : null,
        dividendYield: overview.dividendYield !== null ? new Prisma.Decimal(overview.dividendYield) : null,
        peRatio: overview.peRatio !== null ? new Prisma.Decimal(overview.peRatio) : null,
        analystTargetPrice:
          overview.analystTargetPrice !== null ? new Prisma.Decimal(overview.analystTargetPrice) : null,
        analystStrongBuy: overview.analystStrongBuy,
        analystBuy: overview.analystBuy,
        analystHold: overview.analystHold,
        analystSell: overview.analystSell,
        analystStrongSell: overview.analystStrongSell,
        sector: overview.sector,
        industry: overview.industry,
      };

      await client.securityFundamentals.upsert({
        where: { securityId: security.id },
        update: data,
        create: { securityId: security.id, ...data },
      });
      updated.push(security.symbol);
    }

    const isLastRequestOfBatch = localIndex === securities.length - 1;
    const isLastRequestOfGlobalBudget = globalIndex === maxApiCallsPerRun - 1;
    if (!isLastRequestOfBatch && !isLastRequestOfGlobalBudget) {
      await sleep(requestIntervalMs);
    }
  }

  return { updated, unavailable, skippedOverWeeklyBudget };
}

/// Fetches as much daily-close history as the active MarketDataProvider has
/// for one security (ideally 5+ years) and stores it — a single API call, no
/// rate-limit pacing needed since it's scoped to one symbol. Existing rows
/// (e.g. today's close already written by the daily job) are left alone via
/// `skipDuplicates`, so this is safe to re-run. Returns 0 if the provider has
/// no history for the symbol — the caller decides how to surface that.
export async function backfillPriceHistory(
  securityId: string,
  client: Client = defaultPrisma,
): Promise<{ daysStored: number }> {
  const security = await client.security.findUniqueOrThrow({ where: { id: securityId } });
  const provider = getPricingProvider();
  const history = await provider.fetchDailyHistory(security.symbol);
  if (!history) return { daysStored: 0 };

  const result = await client.priceHistory.createMany({
    data: history.map((point) => ({
      securityId,
      date: new Date(`${point.date}T00:00:00.000Z`),
      closePrice: new Prisma.Decimal(point.closePrice),
    })),
    skipDuplicates: true,
  });

  return { daysStored: result.count };
}

export type BulkBackfillSummary = {
  backfilled: string[];
  unavailable: string[];
  skippedOverBudget: string[];
};

/// Runs `backfillPriceHistory` across every Security, rate-limited like the
/// daily/weekly jobs since it's one API call per symbol. Intended for
/// catching up securities that predate the backfill feature (new securities
/// added via /admin get backfilled automatically on creation instead).
export async function backfillAllPriceHistory(options?: {
  client?: PrismaClient;
  maxApiCallsPerRun?: number;
  requestIntervalMs?: number;
}): Promise<BulkBackfillSummary> {
  const client = options?.client ?? defaultPrisma;
  const maxApiCallsPerRun = options?.maxApiCallsPerRun ?? TWELVE_DATA_FREE_TIER_MAX_REQUESTS_PER_DAY;
  const requestIntervalMs = options?.requestIntervalMs ?? TWELVE_DATA_SINGLE_REQUEST_INTERVAL_MS;

  const securities = await client.security.findMany({ orderBy: { symbol: "asc" } });

  const backfilled: string[] = [];
  const unavailable: string[] = [];
  const skippedOverBudget: string[] = [];

  for (let index = 0; index < securities.length; index += 1) {
    const security = securities[index];

    if (index >= maxApiCallsPerRun) {
      skippedOverBudget.push(security.symbol);
      continue;
    }

    const result = await backfillPriceHistory(security.id, client);
    if (result.daysStored > 0) backfilled.push(security.symbol);
    else unavailable.push(security.symbol);

    const isLastRequestOfRun = index === securities.length - 1 || index === maxApiCallsPerRun - 1;
    if (!isLastRequestOfRun) {
      await sleep(requestIntervalMs);
    }
  }

  return { backfilled, unavailable, skippedOverBudget };
}

/// The public contract this module fulfills for the rest of the app — kept
/// here as a compile-time check that the module's shape stays stable for
/// consumers (trading engine, portfolio aggregation, UI pages). See
/// ARCHITECTURE.md for the "swap the pricing provider" guide.
export interface MarketDataService {
  searchSecurities: typeof searchSecurities;
  getSecurityBySymbol: typeof getSecurityBySymbol;
  getLatestPrice: typeof getLatestPrice;
  getLatestPricingDate: typeof getLatestPricingDate;
  getPriceHistory: typeof getPriceHistory;
  getFundamentals: typeof getFundamentals;
  updateAllClosingPrices: typeof updateAllClosingPrices;
  updateAllFundamentals: typeof updateAllFundamentals;
  backfillPriceHistory: typeof backfillPriceHistory;
  backfillAllPriceHistory: typeof backfillAllPriceHistory;
}
