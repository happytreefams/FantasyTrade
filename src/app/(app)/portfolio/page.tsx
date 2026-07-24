import Link from "next/link";

import { AllocationDonut } from "@/components/allocation-donut";
import { BenchmarkPerformanceChart } from "@/components/benchmark-performance-chart";
import { PendingOrdersTable } from "@/components/pending-orders-table";
import { PortfolioTabs } from "@/components/portfolio-tabs";
import { PositionsTable } from "@/components/positions-table";
import { requireAccount } from "@/lib/current-account";
import { BENCHMARK_SYMBOL, RISK_FREE_RATE } from "@/lib/constants";
import { formatAsOfDate, formatCurrency, formatShares } from "@/lib/format";
import { LEARNING_LINKS } from "@/lib/learning";
import { getLatestPricingDate } from "@/lib/market-data";
import {
  getBenchmarkComparison,
  getOpenPositionLots,
  getOrderHistory,
  getPendingOrders,
  getPortfolioSummary,
  getRealizedGainsForYear,
  getRiskMetrics,
  getSectorAllocation,
  type RiskMetrics,
} from "@/lib/portfolio";

const ORDER_STATUS_STYLES: Record<string, string> = {
  FILLED: "bg-positive-bg text-positive",
  REJECTED: "bg-negative-bg text-negative",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  MARKET: "Market",
  LIMIT: "Limit",
  STOP_LOSS: "Stop-loss",
  STOP_LIMIT: "Stop-limit",
};

const TERM_STYLES: Record<string, string> = {
  SHORT_TERM: "bg-background-inset text-foreground-muted",
  LONG_TERM: "bg-positive-bg text-positive",
};

export default async function PortfolioPage() {
  const { account } = await requireAccount();
  const currentYear = new Date().getFullYear();

  const [summary, orders, pendingOrders, pricesAsOf, benchmarkPoints, riskMetrics, sectorAllocation, openLots, realizedGains] =
    await Promise.all([
      getPortfolioSummary(account.id),
      getOrderHistory(account.id),
      getPendingOrders(account.id),
      getLatestPricingDate().then(formatAsOfDate),
      getBenchmarkComparison(account.id, BENCHMARK_SYMBOL),
      getRiskMetrics(account.id, BENCHMARK_SYMBOL),
      getSectorAllocation(account.id),
      getOpenPositionLots(account.id),
      getRealizedGainsForYear(account.id, currentYear),
    ]);

  const positionRows = summary.positions.map((position) => ({
    id: position.id,
    securityId: position.security.id,
    symbol: position.security.symbol,
    name: position.security.name,
    assetType: position.security.assetType,
    quantity: position.quantity.toString(),
    avgCostBasis: position.avgCostBasis.toString(),
    dripEnabled: position.dripEnabled,
    lastClose: position.lastClose?.toString() ?? null,
    marketValue: position.marketValue.toString(),
    unrealizedGain: position.unrealizedGain.toString(),
    unrealizedGainPercent: position.unrealizedGainPercent.toString(),
  }));

  const pendingOrderRows = pendingOrders.map((order) => ({
    id: order.id,
    symbol: order.security.symbol,
    name: order.security.name,
    side: order.side,
    orderType: order.orderType,
    triggerPrice: order.triggerPrice.toString(),
    limitPrice: order.limitPrice?.toString() ?? null,
    quantity: order.quantity.toString(),
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt?.toISOString() ?? null,
  }));

  const buyingPower = account.cashBalance.minus(account.marginUsed);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-display font-semibold tracking-tight">Portfolio</h1>
        {pricesAsOf ? <p className="text-caption text-foreground-muted">Prices as of {pricesAsOf} close</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total portfolio value" value={formatCurrency(summary.totalPortfolioValue.toString())} />
        <SummaryCard label="Cash balance" value={formatCurrency(summary.cashBalance.toString())} />
        <SummaryCard label="Holdings value" value={formatCurrency(summary.totalMarketValue.toString())} />
      </div>

      {account.marginEnabled ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard label="Margin used" value={formatCurrency(account.marginUsed.toString())} />
          <SummaryCard label="Buying power" value={formatCurrency(buyingPower.toString())} />
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-title font-semibold">Portfolio Analytics</h2>
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-lg border border-border bg-background-elevated p-4">
            <h3 className="mb-2 text-body font-semibold">Performance vs. {BENCHMARK_SYMBOL}</h3>
            <BenchmarkPerformanceChart points={benchmarkPoints} benchmarkLabel={BENCHMARK_SYMBOL} />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <RiskMetricsCard metrics={riskMetrics} />

            <section className="rounded-lg border border-border bg-background-elevated p-6">
              <h3 className="mb-3 text-body font-semibold">Sector allocation</h3>
              {sectorAllocation.length === 0 ? (
                <p className="text-body text-foreground-muted">No holdings to allocate yet.</p>
              ) : (
                <AllocationDonut segments={sectorAllocation} />
              )}
            </section>
          </div>
        </div>
      </div>

      <PortfolioTabs
        positionsPanel={
          <div className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-lg border border-border bg-background-elevated">
              <h2 className="border-b border-border px-4 py-3 text-title font-semibold">Positions</h2>
              <PositionsTable positions={positionRows} />
            </section>

            <section className="overflow-hidden rounded-lg border border-border bg-background-elevated">
              <h2 className="border-b border-border px-4 py-3 text-title font-semibold">Order history</h2>
              {orders.length === 0 ? (
                <p className="p-4 text-body text-foreground-muted">No trades yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="text-caption text-foreground-muted">
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Symbol</th>
                        <th className="px-4 py-2 text-left">Side</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-border">
                          <td className="px-4 py-3 text-caption text-foreground-muted">
                            {order.createdAt.toLocaleString("en-US")}
                          </td>
                          <td className="px-4 py-3 font-medium">{order.security.symbol}</td>
                          <td className={`px-4 py-3 ${order.side === "BUY" ? "text-positive" : "text-negative"}`}>
                            {order.side}
                          </td>
                          <td className="px-4 py-3 text-caption text-foreground-muted">
                            {order.orderType === "MARKET"
                              ? "Market"
                              : `${ORDER_TYPE_LABELS[order.orderType]} @ ${formatCurrency((order.limitPrice ?? order.triggerPrice)?.toString() ?? "0")}`}
                          </td>
                          <td className="px-4 py-3 text-right font-financial">{formatShares(order.quantity.toString())}</td>
                          <td className="px-4 py-3 text-right font-financial">
                            {order.priceAtExecution ? formatCurrency(order.priceAtExecution.toString()) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-caption ${ORDER_STATUS_STYLES[order.status]}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        }
        pendingOrdersPanel={
          <section className="overflow-hidden rounded-lg border border-border bg-background-elevated">
            <h2 className="border-b border-border px-4 py-3 text-title font-semibold">Pending Orders</h2>
            <PendingOrdersTable orders={pendingOrderRows} />
          </section>
        }
        taxLotsPanel={
          <div className="flex flex-col gap-4">
            <p className="rounded-md bg-background-inset px-3 py-2 text-caption text-foreground-muted">
              Simulated, educational report only — not tax advice. Real capital-gains treatment (short vs. long-term
              rates, inclusion rates, and what counts as a taxable account at all) depends on your jurisdiction and
              account type.{" "}
              <Link href={`/learn/lessons/${LEARNING_LINKS.rrspVsTfsaLesson}`} className="text-accent hover:underline">
                Learn about TFSAs and RRSPs
              </Link>{" "}
              — inside a real registered account, gains like these would be taxed differently (or not at all).
            </p>

            <section className="overflow-hidden rounded-lg border border-border bg-background-elevated">
              <h2 className="border-b border-border px-4 py-3 text-title font-semibold">Open tax lots</h2>
              {openLots.length === 0 ? (
                <p className="p-4 text-body text-foreground-muted">No open positions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="text-caption text-foreground-muted">
                        <th className="px-4 py-2 text-left">Symbol</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Cost basis</th>
                        <th className="px-4 py-2 text-left">Purchase date</th>
                        <th className="px-4 py-2 text-right">Unrealized gain/loss</th>
                        <th className="px-4 py-2 text-left">Holding period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openLots.map((lot) => (
                        <tr key={lot.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">{lot.security.symbol}</td>
                          <td className="px-4 py-3 text-right font-financial">{formatShares(lot.quantity.toString())}</td>
                          <td className="px-4 py-3 text-right font-financial">{formatCurrency(lot.costBasis.toString())}</td>
                          <td className="px-4 py-3 text-caption text-foreground-muted">{formatAsOfDate(lot.purchaseDate)}</td>
                          <td
                            className={`px-4 py-3 text-right font-financial ${
                              lot.unrealizedGain.greaterThanOrEqualTo(0) ? "text-positive" : "text-negative"
                            }`}
                          >
                            {formatCurrency(lot.unrealizedGain.toString())}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-caption ${TERM_STYLES[lot.term]}`}>
                              {lot.holdingPeriodDays}d · {lot.term === "LONG_TERM" ? "Long-term" : "Short-term"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-lg border border-border bg-background-elevated">
              <h2 className="border-b border-border px-4 py-3 text-title font-semibold">
                Realized gains ({currentYear})
              </h2>
              {realizedGains.rows.length === 0 ? (
                <p className="p-4 text-body text-foreground-muted">No positions closed this year yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-body">
                      <thead>
                        <tr className="text-caption text-foreground-muted">
                          <th className="px-4 py-2 text-left">Closed</th>
                          <th className="px-4 py-2 text-left">Symbol</th>
                          <th className="px-4 py-2 text-right">Quantity</th>
                          <th className="px-4 py-2 text-right">Cost basis</th>
                          <th className="px-4 py-2 text-right">Proceeds</th>
                          <th className="px-4 py-2 text-right">Gain/loss</th>
                          <th className="px-4 py-2 text-left">Term</th>
                        </tr>
                      </thead>
                      <tbody>
                        {realizedGains.rows.map((row) => (
                          <tr key={row.id} className="border-t border-border">
                            <td className="px-4 py-3 text-caption text-foreground-muted">{formatAsOfDate(row.closedAt)}</td>
                            <td className="px-4 py-3 font-medium">{row.security.symbol}</td>
                            <td className="px-4 py-3 text-right font-financial">{formatShares(row.quantity.toString())}</td>
                            <td className="px-4 py-3 text-right font-financial">{formatCurrency(row.costBasis.toString())}</td>
                            <td className="px-4 py-3 text-right font-financial">{formatCurrency(row.proceeds.toString())}</td>
                            <td
                              className={`px-4 py-3 text-right font-financial ${
                                row.gainLoss.greaterThanOrEqualTo(0) ? "text-positive" : "text-negative"
                              }`}
                            >
                              {formatCurrency(row.gainLoss.toString())}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded px-2 py-0.5 text-caption ${TERM_STYLES[row.term]}`}>
                                {row.term === "LONG_TERM" ? "Long-term" : "Short-term"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border px-4 py-3 text-body">
                    <span>
                      <span className="text-foreground-muted">Short-term total </span>
                      <span
                        className={`font-financial font-medium ${
                          realizedGains.shortTermTotal.greaterThanOrEqualTo(0) ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatCurrency(realizedGains.shortTermTotal.toString())}
                      </span>
                    </span>
                    <span>
                      <span className="text-foreground-muted">Long-term total </span>
                      <span
                        className={`font-financial font-medium ${
                          realizedGains.longTermTotal.greaterThanOrEqualTo(0) ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatCurrency(realizedGains.longTermTotal.toString())}
                      </span>
                    </span>
                    <span>
                      <span className="text-foreground-muted">Total realized </span>
                      <span
                        className={`font-financial font-semibold ${
                          realizedGains.totalGainLoss.greaterThanOrEqualTo(0) ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatCurrency(realizedGains.totalGainLoss.toString())}
                      </span>
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>
        }
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background-elevated p-4">
      <p className="text-caption text-foreground-muted">{label}</p>
      <p className="font-financial text-title font-semibold">{value}</p>
    </div>
  );
}

function RiskMetricsCard({ metrics }: { metrics: RiskMetrics }) {
  if (metrics.status === "insufficient-history") {
    return (
      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h3 className="mb-1 text-body font-semibold">Risk metrics</h3>
        <p className="text-body text-foreground-muted">
          Building history — {metrics.daysRecorded} of {metrics.daysNeeded} days recorded. Volatility, beta, and the
          Sharpe ratio need at least {metrics.daysNeeded} days of daily-close history (yours and {BENCHMARK_SYMBOL}
          &apos;s) before they&apos;re statistically meaningful.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-background-elevated p-6">
      <h3 className="mb-3 text-body font-semibold">Risk metrics</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RiskStat
          label="Volatility"
          value={`${(metrics.volatility * 100).toFixed(1)}%`}
          explanation="How much your portfolio's daily value swings, annualized — higher means a bumpier ride."
        />
        <RiskStat
          label="Beta"
          value={metrics.beta.toFixed(2)}
          explanation={`How much your portfolio moves relative to ${BENCHMARK_SYMBOL} — 1.00 means it moves with the market.`}
        />
        <RiskStat
          label="Sharpe ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          explanation={`Return earned per unit of risk, above an illustrative ${(RISK_FREE_RATE * 100).toFixed(0)}% risk-free rate — higher is better.`}
        />
      </div>
    </section>
  );
}

function RiskStat({ label, value, explanation }: { label: string; value: string; explanation: string }) {
  return (
    <div>
      <p className="text-caption text-foreground-muted">{label}</p>
      <p className="font-financial text-title font-semibold">{value}</p>
      <p className="mt-1 text-caption text-foreground-subtle">{explanation}</p>
    </div>
  );
}
