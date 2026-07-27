import { alphaVantageProvider } from "./alpha-vantage";
import { twelveDataProvider } from "./twelve-data";
import type { MarketDataProvider } from "./types";

export type { EodQuote, FundamentalsQuote, MarketDataProvider, NewsHeadline } from "./types";

/// The daily-close job's and price-history backfill's pricing source —
/// Twelve Data since Tier 10 (see ./twelve-data.ts): its free tier (800
/// requests/day, 8/minute, batched multi-symbol requests) scales to the
/// full S&P 500 universe far better than Alpha Vantage's ~25/day did.
/// Swapping pricing sources again means adding a new file beside
/// alpha-vantage.ts/twelve-data.ts that implements MarketDataProvider and
/// returning it here — nothing else in the app needs to change.
export function getPricingProvider(): MarketDataProvider {
  return twelveDataProvider;
}

/// SecurityFundamentals (market cap, valuation ratios, analyst ratings) and
/// news headlines stay on Alpha Vantage — see ./alpha-vantage.ts. There's no
/// rate-limit pressure driving a change here: the weekly fundamentals job
/// and on-demand news lookups are both low-volume compared to the daily
/// price job that motivated the Twelve Data move.
export function getFundamentalsProvider(): MarketDataProvider {
  return alphaVantageProvider;
}
