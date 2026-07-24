import { describe, expect, it } from "vitest";

import { computeScore } from "./index";
import { computeSuggestedTrades, type ModelPortfolioSleeve } from "./model-portfolios";
import { MAX_SCORE, MIN_SCORE, RISK_QUESTIONS, scoreToCategory } from "./questions";

describe("scoreToCategory", () => {
  it("has a 0–24 range across 6 four-point questions", () => {
    expect(MIN_SCORE).toBe(0);
    expect(MAX_SCORE).toBe(24);
    expect(RISK_QUESTIONS).toHaveLength(6);
  });

  it("maps every band boundary to the expected category", () => {
    expect(scoreToCategory(0)).toBe("CONSERVATIVE");
    expect(scoreToCategory(4)).toBe("CONSERVATIVE");
    expect(scoreToCategory(5)).toBe("MODERATE_CONSERVATIVE");
    expect(scoreToCategory(9)).toBe("MODERATE_CONSERVATIVE");
    expect(scoreToCategory(10)).toBe("MODERATE");
    expect(scoreToCategory(14)).toBe("MODERATE");
    expect(scoreToCategory(15)).toBe("MODERATE_AGGRESSIVE");
    expect(scoreToCategory(19)).toBe("MODERATE_AGGRESSIVE");
    expect(scoreToCategory(20)).toBe("AGGRESSIVE");
    expect(scoreToCategory(24)).toBe("AGGRESSIVE");
  });
});

describe("computeScore", () => {
  it("sums 0 when every answer picks the lowest-point option", () => {
    const answers = Object.fromEntries(RISK_QUESTIONS.map((q) => [q.id, 0]));
    expect(computeScore(answers)).toBe(0);
  });

  it("sums to MAX_SCORE when every answer picks the highest-point option", () => {
    const answers = Object.fromEntries(RISK_QUESTIONS.map((q) => [q.id, q.options.length - 1]));
    expect(computeScore(answers)).toBe(MAX_SCORE);
  });

  it("treats a missing answer as 0 points rather than throwing", () => {
    const answers = Object.fromEntries(RISK_QUESTIONS.slice(1).map((q) => [q.id, q.options.length - 1]));
    // First question unanswered — contributes 0, so total is MAX_SCORE minus that question's max.
    expect(computeScore(answers)).toBe(MAX_SCORE - 4);
  });
});

describe("computeSuggestedTrades", () => {
  const sleeves: ModelPortfolioSleeve[] = [
    { symbol: "VTI", label: "Broad-market equities (VTI)", percent: 60 },
    { symbol: "AGG", label: "Investment-grade bonds (AGG)", percent: 30 },
    { symbol: "GLD", label: "Commodities — gold (GLD)", percent: 5 },
    { symbol: null, label: "Cash", percent: 5 },
  ];
  const prices = { VTI: 295.4, AGG: 98.3, GLD: 245.6 };

  it("floors each sleeve to a whole number of shares and reports the cash sleeve separately", () => {
    const result = computeSuggestedTrades(sleeves, 10_000, prices);

    // 10,000 * 60% = 6000 / 295.4 = 20.3.. -> 20 shares
    const vti = result.trades.find((t) => t.symbol === "VTI")!;
    expect(vti.shares).toBe(20);
    expect(vti.estimatedCost).toBeCloseTo(20 * 295.4, 5);

    // 10,000 * 30% = 3000 / 98.3 = 30.5.. -> 30 shares
    const agg = result.trades.find((t) => t.symbol === "AGG")!;
    expect(agg.shares).toBe(30);

    // 10,000 * 5% = 500 / 245.6 = 2.03.. -> 2 shares
    const gld = result.trades.find((t) => t.symbol === "GLD")!;
    expect(gld.shares).toBe(2);

    // No trade object for the cash sleeve — it's tracked separately.
    expect(result.trades).toHaveLength(3);
    expect(result.cashSleevePercent).toBe(5);
  });

  it("never spends more than the available cash, and leftover cash accounts for whole-share rounding", () => {
    const result = computeSuggestedTrades(sleeves, 10_000, prices);
    expect(result.totalEstimatedCost).toBeLessThanOrEqual(10_000);
    expect(result.leftoverCash).toBeGreaterThanOrEqual(0);
    expect(result.leftoverCash).toBeCloseTo(10_000 - result.totalEstimatedCost, 5);
  });

  it("skips a sleeve entirely when no price is available for it", () => {
    const result = computeSuggestedTrades(sleeves, 10_000, { VTI: 295.4, AGG: 98.3 });
    expect(result.trades.find((t) => t.symbol === "GLD")).toBeUndefined();
    expect(result.trades).toHaveLength(2);
  });

  it("produces 0 shares (not a negative or fractional trade) for a tiny cash balance", () => {
    const result = computeSuggestedTrades(sleeves, 10, prices);
    expect(result.trades.every((t) => t.shares === 0)).toBe(true);
    expect(result.totalEstimatedCost).toBe(0);
    expect(result.leftoverCash).toBe(10);
  });
});
