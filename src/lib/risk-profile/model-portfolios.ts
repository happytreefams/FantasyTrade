import type { RiskCategory } from "@prisma/client";

/// One sleeve of a model portfolio. `symbol` is null for the cash sleeve —
/// cash isn't a Security in this app, so that sleeve means "leave this
/// percentage uninvested" rather than a trade to place.
export type ModelPortfolioSleeve = {
  symbol: string | null;
  label: string;
  percent: number;
};

/// Suggested allocations by risk category, expressed as concrete seeded
/// tickers rather than abstract asset-class percentages: VTI (broad-market
/// equities), AGG (investment-grade bonds), and GLD (gold, representing the
/// commodities sleeve) — all already seeded Securities, reusing the existing
/// daily pricing pipeline. Each category's percentages sum to 100.
export const MODEL_PORTFOLIOS: Record<RiskCategory, ModelPortfolioSleeve[]> = {
  CONSERVATIVE: [
    { symbol: "VTI", label: "Broad-market equities (VTI)", percent: 20 },
    { symbol: "AGG", label: "Investment-grade bonds (AGG)", percent: 70 },
    { symbol: "GLD", label: "Commodities — gold (GLD)", percent: 5 },
    { symbol: null, label: "Cash", percent: 5 },
  ],
  MODERATE_CONSERVATIVE: [
    { symbol: "VTI", label: "Broad-market equities (VTI)", percent: 40 },
    { symbol: "AGG", label: "Investment-grade bonds (AGG)", percent: 50 },
    { symbol: "GLD", label: "Commodities — gold (GLD)", percent: 5 },
    { symbol: null, label: "Cash", percent: 5 },
  ],
  MODERATE: [
    { symbol: "VTI", label: "Broad-market equities (VTI)", percent: 60 },
    { symbol: "AGG", label: "Investment-grade bonds (AGG)", percent: 30 },
    { symbol: "GLD", label: "Commodities — gold (GLD)", percent: 5 },
    { symbol: null, label: "Cash", percent: 5 },
  ],
  MODERATE_AGGRESSIVE: [
    { symbol: "VTI", label: "Broad-market equities (VTI)", percent: 75 },
    { symbol: "AGG", label: "Investment-grade bonds (AGG)", percent: 15 },
    { symbol: "GLD", label: "Commodities — gold (GLD)", percent: 5 },
    { symbol: null, label: "Cash", percent: 5 },
  ],
  AGGRESSIVE: [
    { symbol: "VTI", label: "Broad-market equities (VTI)", percent: 90 },
    { symbol: "AGG", label: "Investment-grade bonds (AGG)", percent: 5 },
    { symbol: "GLD", label: "Commodities — gold (GLD)", percent: 5 },
    { symbol: null, label: "Cash", percent: 0 },
  ],
};

export type SuggestedTrade = {
  symbol: string;
  label: string;
  percent: number;
  targetAmount: number;
  price: number;
  shares: number;
  estimatedCost: number;
};

export type SuggestedTradesResult = {
  trades: SuggestedTrade[];
  cashSleevePercent: number;
  totalEstimatedCost: number;
  leftoverCash: number;
};

/// Converts sleeve percentages into concrete whole-share trades against
/// `cashBalance` and current `prices` — pure math, no I/O, so it's testable
/// without a database and reusable for both the results-screen preview and
/// the actual invest step (which recomputes fresh at invest time rather
/// than trusting a client-submitted table). Shares are floored (this app
/// only allows whole-share orders), so `leftoverCash` is always >= 0 and
/// grows with the price of each sleeve's ETF relative to its target dollar
/// amount — a real (if small) rounding effect of whole-share investing, not
/// a bug. A sleeve with no price data (shouldn't happen for the seeded
/// tickers, but defensively) is skipped rather than thrown.
export function computeSuggestedTrades(
  sleeves: ModelPortfolioSleeve[],
  cashBalance: number,
  prices: Record<string, number>,
): SuggestedTradesResult {
  const trades: SuggestedTrade[] = [];
  let cashSleevePercent = 0;
  let totalEstimatedCost = 0;

  for (const sleeve of sleeves) {
    if (sleeve.symbol === null) {
      cashSleevePercent += sleeve.percent;
      continue;
    }

    const price = prices[sleeve.symbol];
    const targetAmount = cashBalance * (sleeve.percent / 100);

    if (!price || price <= 0) {
      continue;
    }

    const shares = Math.floor(targetAmount / price);
    const estimatedCost = shares * price;
    totalEstimatedCost += estimatedCost;

    trades.push({ symbol: sleeve.symbol, label: sleeve.label, percent: sleeve.percent, targetAmount, price, shares, estimatedCost });
  }

  return { trades, cashSleevePercent, totalEstimatedCost, leftoverCash: cashBalance - totalEstimatedCost };
}
