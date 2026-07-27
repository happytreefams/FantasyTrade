import { env } from "@/lib/env";

import type { EodQuote, FundamentalsQuote, MarketDataProvider, NewsHeadline } from "./types";

// ---------------------------------------------------------------------------
// Twelve Data time_series (free tier) — the daily-close job's pricing source
// since Tier 10, once the tradeable universe grew to the full S&P 500.
// Alpha Vantage's ~25 requests/day couldn't cover ~500 symbols; Twelve Data's
// free tier (800/day, 8/minute) can, and its batched `time_series` endpoint
// answers for many symbols in one HTTP call, which is what makes covering
// the whole universe inside a handful of staggered cron invocations
// feasible — see fetchEodCloseBatch below and @/lib/market-data's
// updateAllClosingPrices. Alpha Vantage stays the provider for
// SecurityFundamentals and news (see getFundamentalsProvider in ./index) —
// this provider intentionally leaves those two methods as no-ops.
// ---------------------------------------------------------------------------

const TWELVE_DATA_URL = "https://api.twelvedata.com";

// Twelve Data's free tier: 800 requests/day, 8/minute. Each symbol in a
// batched request still counts as its own request credit — batching only
// reduces HTTP round-trip COUNT, not credit usage.
export const TWELVE_DATA_FREE_TIER_MAX_REQUESTS_PER_DAY = 800;
export const TWELVE_DATA_FREE_TIER_MAX_REQUESTS_PER_MINUTE = 8;

// One HTTP call requests this many symbols at once, sized to exactly the
// per-minute credit cap so a single round trip consumes one minute's whole
// allowance — the batch-size choice that minimizes round trips for a given
// credit budget (a smaller batch size would need more separate calls to
// consume the same credits, with no rate-limit benefit, since the per-minute
// cap is credit-based, not call-count-based).
export const TWELVE_DATA_BATCH_SIZE = 8;

// Spacing between successive batch calls WITHIN one invocation. Because one
// call already spends a full minute's credit allowance (see
// TWELVE_DATA_BATCH_SIZE above), the next call must wait a full minute
// before it's safe to fire — unlike Alpha Vantage's per-symbol ~13s cadence,
// batching changes the pacing unit from "one symbol" to "one full
// per-minute batch". See DEPLOYMENT.md for how this sizes a cron shard.
export const TWELVE_DATA_REQUEST_INTERVAL_MS = 60_000;

// Pacing for single-symbol, non-batched calls (fetchDailyHistory, used by
// the one-time backfill script/admin actions, never the daily job) — one
// request every 1/8 minute, the direct per-minute-cap analogue of Alpha
// Vantage's ALPHA_VANTAGE_REQUEST_INTERVAL_MS.
export const TWELVE_DATA_SINGLE_REQUEST_INTERVAL_MS = 7_500;

type TwelveDataSeriesEntry = {
  meta?: { symbol?: string };
  values?: Array<{ datetime: string; close: string }>;
  status?: string;
  code?: number;
  message?: string;
};

function parseSeriesEntry(entry: TwelveDataSeriesEntry | undefined): EodQuote | null {
  if (!entry || entry.status === "error") return null;
  const latest = entry.values?.[0];
  if (!latest?.datetime || !latest.close) return null;

  const closePrice = Number(latest.close);
  if (!Number.isFinite(closePrice)) return null;

  return { date: latest.datetime, closePrice };
}

/// Fetches the latest daily close for multiple symbols in one HTTP call via
/// `time_series?symbol=A,B,C&outputsize=1`. Twelve Data returns a flat
/// `{ meta, values, status }` shape when only one symbol is requested, and a
/// `{ SYMBOL: { meta, values, status }, ... }` shape (keyed by symbol) for
/// two or more — both are normalized here so every requested symbol gets an
/// entry in the returned map (null if missing or unparseable), same
/// null-on-failure contract as every other provider method.
async function fetchEodCloseBatch(symbols: string[]): Promise<Record<string, EodQuote | null>> {
  const result: Record<string, EodQuote | null> = {};
  for (const symbol of symbols) result[symbol] = null;
  if (symbols.length === 0) return result;

  const apiKey = env.TWELVE_DATA_API_KEY;
  if (!apiKey) return result;

  try {
    const url = new URL(`${TWELVE_DATA_URL}/time_series`);
    url.searchParams.set("symbol", symbols.join(","));
    url.searchParams.set("interval", "1day");
    url.searchParams.set("outputsize", "1");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return result;

    const data = await response.json();
    if (data["status"] === "error") return result;

    if (symbols.length === 1) {
      result[symbols[0]] = parseSeriesEntry(data as TwelveDataSeriesEntry);
      return result;
    }

    for (const symbol of symbols) {
      result[symbol] = parseSeriesEntry(data[symbol] as TwelveDataSeriesEntry | undefined);
    }
    return result;
  } catch {
    return result;
  }
}

/// Single-symbol convenience wrapper — required by the MarketDataProvider
/// interface, but the daily-close job calls `fetchEodCloseBatch` directly
/// wherever possible (see @/lib/market-data) since a 1-symbol call wastes
/// the round-trip savings batching exists for.
async function fetchEodClose(symbol: string): Promise<EodQuote | null> {
  const result = await fetchEodCloseBatch([symbol]);
  return result[symbol] ?? null;
}

/// Fetches as much daily-close history as Twelve Data has for one symbol —
/// used only by the one-time backfill (scripts/backfill-history.ts) and the
/// admin single-security backfill action, not the daily job, so no batching
/// or rate-limit pacing needed here (one call per invocation of this
/// function; callers pace repeated calls themselves). `outputsize=5000` is
/// Twelve Data's max for time_series (~20 years of daily bars for most
/// symbols).
async function fetchDailyHistory(symbol: string): Promise<EodQuote[] | null> {
  const apiKey = env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(`${TWELVE_DATA_URL}/time_series`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", "1day");
    url.searchParams.set("outputsize", "5000");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data["status"] === "error" || !Array.isArray(data["values"])) return null;

    const quotes: EodQuote[] = [];
    for (const point of data["values"] as Array<{ datetime: string; close: string }>) {
      const closePrice = Number(point.close);
      if (point.datetime && Number.isFinite(closePrice)) {
        quotes.push({ date: point.datetime, closePrice });
      }
    }

    return quotes.length > 0 ? quotes : null;
  } catch {
    return null;
  }
}

/// Twelve Data is only ever selected via `getPricingProvider()` (see
/// ./index.ts) — SecurityFundamentals and news stay on Alpha Vantage via
/// `getFundamentalsProvider()`. These two are intentionally unimplemented
/// no-ops rather than omitted, so this file still satisfies the
/// MarketDataProvider interface in full.
async function fetchFundamentals(): Promise<FundamentalsQuote | null> {
  return null;
}

async function fetchNews(): Promise<NewsHeadline[] | null> {
  return null;
}

export const twelveDataProvider: MarketDataProvider = {
  name: "twelve-data",
  fetchEodClose,
  fetchEodCloseBatch,
  fetchDailyHistory,
  fetchFundamentals,
  fetchNews,
};
