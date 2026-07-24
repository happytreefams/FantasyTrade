import { describe, expect, it } from "vitest";

import { computeRiskMetrics, type BenchmarkComparisonPoint } from "./index";

/// Builds a date-aligned, rebased-to-100 point series from a list of daily
/// benchmark returns, with the portfolio tracking the benchmark at a fixed
/// `leverage` multiple of each day's return (1 = identical, 2 = 2x exposure).
/// Mirrors exactly what `getBenchmarkComparison` would hand to
/// `computeRiskMetrics`, without needing a database.
function buildPoints(returns: number[], leverage = 1): BenchmarkComparisonPoint[] {
  let benchmarkValue = 100;
  let accountValue = 100;
  const points: BenchmarkComparisonPoint[] = [
    { date: "day-0", accountIndexed: accountValue, benchmarkIndexed: benchmarkValue },
  ];

  returns.forEach((dailyReturn, index) => {
    benchmarkValue *= 1 + dailyReturn;
    accountValue *= 1 + dailyReturn * leverage;
    points.push({ date: `day-${index + 1}`, accountIndexed: accountValue, benchmarkIndexed: benchmarkValue });
  });

  return points;
}

// A varied (non-constant) daily-return pattern — needed so variance isn't
// zero, which would make beta trivially undefined-guarded rather than a
// real computed value.
const VARIED_RETURNS = Array.from({ length: 34 }, (_, i) => (i % 2 === 0 ? 0.012 : -0.007));

describe("computeRiskMetrics", () => {
  it("reports insufficient history below the minimum aligned data points", () => {
    const points = buildPoints(VARIED_RETURNS.slice(0, 10));
    const result = computeRiskMetrics(points);

    expect(result.status).toBe("insufficient-history");
    if (result.status === "insufficient-history") {
      expect(result.daysRecorded).toBe(points.length);
      expect(result.daysNeeded).toBe(30);
    }
  });

  it("computes beta ≈ 1 when the portfolio tracks the benchmark exactly", () => {
    const points = buildPoints(VARIED_RETURNS, 1);
    const result = computeRiskMetrics(points);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.beta).toBeCloseTo(1, 6);
      expect(result.volatility).toBeGreaterThan(0);
      expect(result.dataPoints).toBe(points.length);
    }
  });

  it("computes beta ≈ 2 when the portfolio moves at 2x the benchmark's daily return", () => {
    const points = buildPoints(VARIED_RETURNS, 2);
    const result = computeRiskMetrics(points);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.beta).toBeCloseTo(2, 6);
      // Same relative pattern, twice the swing — volatility should roughly double too.
      const unlevered = computeRiskMetrics(buildPoints(VARIED_RETURNS, 1));
      if (unlevered.status === "ready") {
        expect(result.volatility).toBeCloseTo(unlevered.volatility * 2, 6);
      }
    }
  });

  it("produces a positive Sharpe ratio when average daily returns are strongly positive", () => {
    const stronglyPositive = Array.from({ length: 34 }, () => 0.01);
    // A perfectly constant return makes benchmark variance zero, so mix in a
    // tiny wobble to keep the risk metrics well-defined while staying net positive.
    const wobble = stronglyPositive.map((r, i) => (i % 2 === 0 ? r + 0.002 : r - 0.002));
    const points = buildPoints(wobble, 1);

    const result = computeRiskMetrics(points);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.sharpeRatio).toBeGreaterThan(0);
    }
  });
});
