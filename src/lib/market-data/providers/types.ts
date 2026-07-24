export type EodQuote = {
  date: string;
  closePrice: number;
};

/// Slow-changing per-security stats pulled from a pricing API's "overview"
/// endpoint. Every field is nullable — a provider should return whatever it
/// has and null for anything it doesn't, rather than omitting the field or
/// throwing. `marketCap` is a string (not bigint) at the provider boundary
/// so a provider implementation never has to deal with bigint parsing edge
/// cases beyond validating it's a plain digit string.
export type FundamentalsQuote = {
  marketCap: string | null;
  week52High: number | null;
  week52Low: number | null;
  dividendYield: number | null;
  peRatio: number | null;
  analystTargetPrice: number | null;
  analystStrongBuy: number | null;
  analystBuy: number | null;
  analystHold: number | null;
  analystSell: number | null;
  analystStrongSell: number | null;
  sector: string | null;
  industry: string | null;
};

export type NewsHeadline = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

/// The contract any pricing source must satisfy to feed the daily-close job,
/// the weekly fundamentals refresh, and the one-time price-history backfill.
/// Swapping providers (a different EOD API, a real-time-quote upgrade, a
/// crypto feed) means writing a new implementation of this interface and
/// pointing `getMarketDataProvider` at it — no changes to the job
/// orchestration, trading engine, or UI.
export interface MarketDataProvider {
  readonly name: string;

  /// Fetches the most recent daily close for `symbol`. Must resolve to null
  /// rather than throw on rate limiting, an unrecognized symbol, a missing
  /// API key, or any network/parsing failure — callers fall back to a
  /// synthetic price in that case.
  fetchEodClose(symbol: string): Promise<EodQuote | null>;

  /// Fetches as much daily-close history as the provider has for `symbol`
  /// (ideally 5+ years), oldest first or any order — callers sort. Same
  /// null-on-any-failure contract as `fetchEodClose`.
  fetchDailyHistory(symbol: string): Promise<EodQuote[] | null>;

  /// Fetches valuation/analyst-rating fundamentals for `symbol`. Resolves to
  /// null if the symbol has no coverage at all; individual fields inside a
  /// non-null result may still be null if the provider doesn't report them.
  fetchFundamentals(symbol: string): Promise<FundamentalsQuote | null>;

  /// Fetches recent news headlines for `symbol`, most recent first. Same
  /// null-on-any-failure contract as the other methods — a bad symbol, rate
  /// limit, missing API key, or network error all resolve to null rather
  /// than throw, so a caller can render an empty state instead of crashing
  /// the security page.
  fetchNews(symbol: string): Promise<NewsHeadline[] | null>;
}
