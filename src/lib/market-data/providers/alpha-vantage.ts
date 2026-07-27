import { env } from "@/lib/env";

import type { EodQuote, FundamentalsQuote, MarketDataProvider, NewsHeadline } from "./types";

// ---------------------------------------------------------------------------
// Alpha Vantage TIME_SERIES_DAILY (free tier) — the default MarketDataProvider.
// ---------------------------------------------------------------------------

const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";

// Alpha Vantage's free tier: ~5 requests/minute, ~25/day. Space calls out and
// cap the daily batch — scaling past ~25 symbols/day needs a paid tier.
export const ALPHA_VANTAGE_FREE_TIER_MAX_REQUESTS_PER_DAY = 25;
export const ALPHA_VANTAGE_REQUEST_INTERVAL_MS = 13_000;

async function fetchEodClose(symbol: string): Promise<EodQuote | null> {
  const apiKey = env.MARKET_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(ALPHA_VANTAGE_URL);
    url.searchParams.set("function", "TIME_SERIES_DAILY");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("outputsize", "compact");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();

    // Alpha Vantage reports rate limits / bad symbols / bad keys with a 200
    // response and one of these keys instead of a real payload.
    if (data["Note"] || data["Information"] || data["Error Message"]) {
      return null;
    }

    const series = data["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
    if (!series) return null;

    const [mostRecentDate] = Object.keys(series).sort().reverse();
    const closeString = mostRecentDate ? series[mostRecentDate]?.["4. close"] : undefined;
    if (!mostRecentDate || !closeString) return null;

    const closePrice = Number(closeString);
    if (!Number.isFinite(closePrice)) return null;

    return { date: mostRecentDate, closePrice };
  } catch {
    return null;
  }
}

/// Fetches full daily-close history (up to 20+ years where Alpha Vantage has
/// it) in a single call — used for the one-time price-history backfill, not
/// the daily job (which only needs the latest close).
async function fetchDailyHistory(symbol: string): Promise<EodQuote[] | null> {
  const apiKey = env.MARKET_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(ALPHA_VANTAGE_URL);
    url.searchParams.set("function", "TIME_SERIES_DAILY");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("outputsize", "full");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data["Note"] || data["Information"] || data["Error Message"]) return null;

    const series = data["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
    if (!series) return null;

    const quotes: EodQuote[] = [];
    for (const [date, values] of Object.entries(series)) {
      const closePrice = Number(values["4. close"]);
      if (Number.isFinite(closePrice)) quotes.push({ date, closePrice });
    }

    return quotes.length > 0 ? quotes : null;
  } catch {
    return null;
  }
}

/// Alpha Vantage reports missing/inapplicable fields as the literal string
/// "None" (or occasionally "-") rather than omitting the key.
function parseOverviewNumber(value: string | undefined): number | null {
  if (!value || value === "None" || value === "-") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseOverviewString(value: string | undefined): string | null {
  if (!value || value === "None" || value === "-") return null;
  return value;
}

/// MarketCapitalization arrives as a plain digit string (e.g. "3020281999360").
/// Kept as a string here (not bigint) so the provider layer never has to
/// import a bigint-parsing concern beyond validating the shape.
function parseOverviewBigIntString(value: string | undefined): string | null {
  if (!value || value === "None" || value === "-") return null;
  return /^\d+$/.test(value) ? value : null;
}

async function fetchFundamentals(symbol: string): Promise<FundamentalsQuote | null> {
  const apiKey = env.MARKET_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(ALPHA_VANTAGE_URL);
    url.searchParams.set("function", "OVERVIEW");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data["Note"] || data["Information"] || data["Error Message"]) return null;
    // An unrecognized symbol resolves as an empty {} object rather than an error key.
    if (!data["Symbol"]) return null;

    return {
      marketCap: parseOverviewBigIntString(data["MarketCapitalization"]),
      week52High: parseOverviewNumber(data["52WeekHigh"]),
      week52Low: parseOverviewNumber(data["52WeekLow"]),
      dividendYield: parseOverviewNumber(data["DividendYield"]),
      peRatio: parseOverviewNumber(data["PERatio"]),
      analystTargetPrice: parseOverviewNumber(data["AnalystTargetPrice"]),
      analystStrongBuy: parseOverviewNumber(data["AnalystRatingStrongBuy"]),
      analystBuy: parseOverviewNumber(data["AnalystRatingBuy"]),
      analystHold: parseOverviewNumber(data["AnalystRatingHold"]),
      analystSell: parseOverviewNumber(data["AnalystRatingSell"]),
      analystStrongSell: parseOverviewNumber(data["AnalystRatingStrongSell"]),
      sector: parseOverviewString(data["Sector"]),
      industry: parseOverviewString(data["Industry"]),
    };
  } catch {
    return null;
  }
}

/// Alpha Vantage's NEWS_SENTIMENT timestamps arrive as "20250115T093000"
/// (no separators, no timezone marker) — reformat into a real ISO string so
/// callers can hand it to `Date`/`Intl.DateTimeFormat` directly.
function parseNewsTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

async function fetchNews(symbol: string): Promise<NewsHeadline[] | null> {
  const apiKey = env.MARKET_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(ALPHA_VANTAGE_URL);
    url.searchParams.set("function", "NEWS_SENTIMENT");
    url.searchParams.set("tickers", symbol);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("limit", "5");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data["Note"] || data["Information"] || data["Error Message"]) return null;

    const feed = data["feed"] as Array<Record<string, string>> | undefined;
    if (!feed) return null;

    const headlines: NewsHeadline[] = [];
    for (const item of feed.slice(0, 5)) {
      const publishedAt = parseNewsTimestamp(item["time_published"]);
      if (!item["title"] || !item["url"] || !publishedAt) continue;
      headlines.push({
        title: item["title"],
        url: item["url"],
        source: item["source"] ?? "Unknown",
        publishedAt,
      });
    }

    return headlines.length > 0 ? headlines : null;
  } catch {
    return null;
  }
}

export const alphaVantageProvider: MarketDataProvider = {
  name: "alpha-vantage",
  fetchEodClose,
  fetchDailyHistory,
  fetchFundamentals,
  fetchNews,
};
