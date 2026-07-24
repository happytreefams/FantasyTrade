"use client";

import { useState } from "react";

import { LineChart } from "@/components/line-chart";
import type { BenchmarkComparisonPoint } from "@/lib/portfolio";

/// Wraps LineChart with a show/hide toggle for the benchmark overlay. Both
/// series are already rebased to 100 at the account's inception date by
/// `getBenchmarkComparison` — this component only decides whether to draw
/// the second line, never re-fetches or re-normalizes anything.
export function BenchmarkPerformanceChart({
  points,
  benchmarkLabel,
}: {
  points: BenchmarkComparisonPoint[];
  benchmarkLabel: string;
}) {
  const [showBenchmark, setShowBenchmark] = useState(true);

  if (points.length === 0) {
    return (
      <p className="text-body text-foreground-muted">
        Not enough overlapping price history yet to compare your portfolio against {benchmarkLabel} — check back
        after a few more daily-close runs.
      </p>
    );
  }

  const accountSeries = points.map((point) => ({ date: point.date, value: point.accountIndexed }));
  const benchmarkSeries = points.map((point) => ({ date: point.date, value: point.benchmarkIndexed }));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-caption text-foreground-subtle">Both series indexed to 100 at your account&apos;s first recorded day.</p>
        <button
          type="button"
          onClick={() => setShowBenchmark((value) => !value)}
          aria-pressed={showBenchmark}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-caption font-medium transition-colors ${
            showBenchmark
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border text-foreground-muted hover:text-foreground"
          }`}
        >
          {showBenchmark ? `Hide ${benchmarkLabel}` : `Compare vs. ${benchmarkLabel}`}
        </button>
      </div>

      <LineChart
        data={accountSeries}
        secondarySeries={showBenchmark ? benchmarkSeries : undefined}
        primarySeriesLabel="Your portfolio"
        secondarySeriesLabel={benchmarkLabel}
        emptyMessage="No performance history yet — run the daily-close job to record the first snapshot."
        singlePointHint="check back after the next close for a trend line."
      />
    </div>
  );
}
