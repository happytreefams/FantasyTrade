/// A fixed, illustrative risk-free rate used only for the portfolio Sharpe
/// ratio calculation on /portfolio. NOT live Treasury-bill data — a real app
/// would source this from an actual rates feed. Hardcoded and clearly
/// labeled here so it's obvious this is an assumption, not a live quote.
export const RISK_FREE_RATE = 0.04;

/// The security symbol treated as the S&P 500 benchmark proxy for the
/// /portfolio benchmark comparison and risk metrics — reuses the existing
/// daily price pipeline (it's just another seeded Security) rather than a
/// separate index data feed.
export const BENCHMARK_SYMBOL = "SPY";

export * from "./canada-savings-accounts";
export * from "./margin";
