import Link from "next/link";
import { Prisma } from "@prisma/client";

import { AllocationDonut, type AllocationSegment } from "@/components/allocation-donut";
import { BadgeShelf } from "@/components/badge-shelf";
import { LineChart } from "@/components/line-chart";
import { QuickTradeCard } from "@/components/quick-trade-card";
import { getBadgeDisplayList } from "@/lib/badges";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate, formatCurrency, formatPercent } from "@/lib/format";
import { getLearningStats } from "@/lib/learning";
import { getLatestPricingDate } from "@/lib/market-data";
import { getAccountValueHistory, getPortfolioSummary, getTopMovers } from "@/lib/portfolio";

const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCK: "Stocks",
  ETF: "ETFs",
  BOND: "Bonds",
  COMMODITY: "Commodities",
};

const ASSET_TYPE_CHART_COLORS: Record<string, string> = {
  STOCK: "var(--color-chart-1)",
  ETF: "var(--color-chart-2)",
  BOND: "var(--color-chart-3)",
  COMMODITY: "var(--color-chart-4)",
};

export default async function DashboardPage() {
  const { session, account } = await requireAccount();
  const [summary, history, movers, pricesAsOf, learningStats, badges] = await Promise.all([
    getPortfolioSummary(account.id),
    getAccountValueHistory(account.id, 30),
    getTopMovers(account.id, 5),
    getLatestPricingDate().then(formatAsOfDate),
    getLearningStats(session.user.id),
    getBadgeDisplayList(session.user.id),
  ]);

  const previousSnapshot = history[history.length - 1];
  const dayChange = previousSnapshot
    ? summary.totalPortfolioValue.minus(previousSnapshot.totalValue)
    : new Prisma.Decimal(0);
  const dayChangePercent =
    previousSnapshot && !previousSnapshot.totalValue.isZero()
      ? dayChange.dividedBy(previousSnapshot.totalValue).times(100)
      : new Prisma.Decimal(0);
  const isGain = dayChange.greaterThanOrEqualTo(0);

  const chartData = history.map((snapshot) => ({
    date: snapshot.date.toISOString(),
    value: Number(snapshot.totalValue),
  }));

  const marketValueByType = new Map<string, number>();
  for (const position of summary.positions) {
    const key = position.security.assetType;
    marketValueByType.set(key, (marketValueByType.get(key) ?? 0) + Number(position.marketValue));
  }

  const allocationSegments: AllocationSegment[] = [
    ...Object.keys(ASSET_TYPE_LABELS)
      .filter((type) => marketValueByType.has(type))
      .map((type) => ({
        label: ASSET_TYPE_LABELS[type],
        value: marketValueByType.get(type) ?? 0,
        color: ASSET_TYPE_CHART_COLORS[type],
      })),
    { label: "Cash", value: Number(summary.cashBalance), color: "var(--color-chart-5)" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-display font-semibold tracking-tight">Dashboard</h1>
        {pricesAsOf ? <p className="text-caption text-foreground-muted">Prices as of {pricesAsOf} close</p> : null}
      </div>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <p className="text-caption text-foreground-muted">Total portfolio value</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <p className="font-financial text-display font-semibold leading-none break-all sm:text-hero">
            {formatCurrency(summary.totalPortfolioValue.toString())}
          </p>
          <span
            className={`mb-1 inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium ${
              isGain ? "bg-positive-bg text-positive" : "bg-negative-bg text-negative"
            }`}
          >
            {formatCurrency(dayChange.toString())} ({formatPercent(dayChangePercent.toString())}) today
          </span>
        </div>
        {!previousSnapshot ? (
          <p className="mt-2 text-caption text-foreground-subtle">
            Run the daily-close job to start tracking day-over-day change.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-body">
          <span>
            <span className="text-foreground-muted">Cash </span>
            <span className="font-financial">{formatCurrency(summary.cashBalance.toString())}</span>
          </span>
          <span>
            <span className="text-foreground-muted">Holdings </span>
            <span className="font-financial">{formatCurrency(summary.totalMarketValue.toString())}</span>
          </span>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-caption text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            <span aria-hidden="true">🎓</span>
            {learningStats.completedLessons}/{learningStats.totalLessons} lessons · {learningStats.percentComplete}%
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-background-elevated p-4">
        <h2 className="mb-2 text-title font-semibold">Performance</h2>
        <LineChart
          data={chartData}
          emptyMessage="No performance history yet — run the daily-close job to record the first snapshot."
          singlePointHint="check back after the next close for a trend line."
        />
      </section>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-3 text-title font-semibold">Badges</h2>
        <BadgeShelf badges={badges} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-background-elevated p-6">
          <h2 className="mb-3 text-title font-semibold">Allocation</h2>
          <AllocationDonut segments={allocationSegments} />
        </section>

        <section className="rounded-lg border border-border bg-background-elevated p-6">
          <h2 className="mb-3 text-title font-semibold">Top movers</h2>
          {movers.length === 0 ? (
            <p className="text-body text-foreground-muted">
              {summary.positions.length === 0
                ? "No holdings yet — visit Trade to buy your first position."
                : "Not enough price history yet to show movers."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {movers.map((mover) => {
                const isMoverGain = mover.dayChange.greaterThanOrEqualTo(0);
                return (
                  <li key={mover.security.id} className="flex items-center justify-between text-body">
                    <Link href={`/security/${encodeURIComponent(mover.security.symbol)}`} className="font-medium hover:text-accent hover:underline">
                      {mover.security.symbol}
                    </Link>
                    <span className={`font-financial ${isMoverGain ? "text-positive" : "text-negative"}`}>
                      {formatPercent(mover.dayChangePercent.toString())}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <QuickTradeCard />
      </div>
    </div>
  );
}
