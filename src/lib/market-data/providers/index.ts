import { alphaVantageProvider } from "./alpha-vantage";
import type { MarketDataProvider } from "./types";

export type { EodQuote, FundamentalsQuote, MarketDataProvider, NewsHeadline } from "./types";

/// The single swap point for pricing sources. Today it always returns the
/// Alpha Vantage provider; a future different EOD API, a real-time-quote
/// upgrade, or a crypto feed means adding a new file beside
/// `alpha-vantage.ts` that implements `MarketDataProvider` and returning it
/// here (optionally gated by an env var or feature flag) — nothing else in
/// the app needs to change.
export function getMarketDataProvider(): MarketDataProvider {
  return alphaVantageProvider;
}
