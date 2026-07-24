import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsSection, type AnalyticsFundamentals } from "@/components/analytics-section";
import { OrderForm } from "@/components/order-form";
import { RecentNewsPanel } from "@/components/recent-news-panel";
import { StarButton } from "@/components/star-button";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate, formatCurrency, formatPercent, formatShares } from "@/lib/format";
import { getGlossaryTerms } from "@/lib/glossary";
import { getCourseDetail, LEARNING_LINKS } from "@/lib/learning";
import { getFundamentals, getNews, getPriceHistory, getSecurityBySymbol } from "@/lib/market-data";
import { getPosition } from "@/lib/portfolio";
import { isWatched } from "@/lib/watchlist";

// ~7 calendar years of trading days — comfortably covers the 5Y period
// selector even after weekends/holidays, while remaining a bounded query.
const ANALYTICS_PRICE_HISTORY_DAYS = 1825;

const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCK: "Stock",
  ETF: "ETF",
  BOND: "Bond ETF",
  COMMODITY: "Commodity ETF",
  CRYPTO: "Crypto",
};

const ASSET_TYPE_DESCRIPTIONS: Record<string, string> = {
  STOCK: "A U.S. equity — a direct ownership stake in a single company.",
  ETF: "An exchange-traded fund — a basket of securities tracking an index or theme.",
  BOND: "A bond ETF proxy, tracking a basket of fixed-income securities rather than a single issuer.",
  COMMODITY: "A commodity ETF proxy, tracking the price of a physical commodity or futures index.",
  CRYPTO: "A cryptocurrency — priced with a single simulated daily close here, unlike real 24/7 crypto markets.",
};

const ASSET_TYPE_NUDGE_LABELS: Record<string, string> = {
  STOCK: "stocks",
  ETF: "ETFs",
  BOND: "bonds",
  COMMODITY: "commodities",
  CRYPTO: "crypto",
};

export default async function SecurityDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const { session, account } = await requireAccount();

  const security = await getSecurityBySymbol(symbol);
  if (!security) {
    notFound();
  }

  const introCourseId = LEARNING_LINKS.courseBySymbolAssetType[security.assetType];

  const [priceHistory, fundamentalsRow, position, watched, introCourse, glossaryTerms, newsHeadlines] = await Promise.all([
    getPriceHistory(security.id, ANALYTICS_PRICE_HISTORY_DAYS),
    getFundamentals(security.id),
    getPosition(account.id, security.id),
    isWatched(account.id, security.id),
    introCourseId ? getCourseDetail(introCourseId, session.user.id) : Promise.resolve(null),
    getGlossaryTerms(),
    getNews(security.symbol),
  ]);

  // Convert Decimal/BigInt to plain strings/numbers here — those types can't
  // cross the Server->Client Component boundary as props.
  const fundamentals: AnalyticsFundamentals | null = fundamentalsRow
    ? {
        marketCap: fundamentalsRow.marketCap != null ? fundamentalsRow.marketCap.toString() : null,
        week52High: fundamentalsRow.week52High?.toString() ?? null,
        week52Low: fundamentalsRow.week52Low?.toString() ?? null,
        dividendYield: fundamentalsRow.dividendYield?.toString() ?? null,
        peRatio: fundamentalsRow.peRatio?.toString() ?? null,
        analystTargetPrice: fundamentalsRow.analystTargetPrice?.toString() ?? null,
        analystStrongBuy: fundamentalsRow.analystStrongBuy,
        analystBuy: fundamentalsRow.analystBuy,
        analystHold: fundamentalsRow.analystHold,
        analystSell: fundamentalsRow.analystSell,
        analystStrongSell: fundamentalsRow.analystStrongSell,
        updatedAt: fundamentalsRow.updatedAt.toISOString(),
      }
    : null;

  const showLearningNudge = introCourse ? !introCourse.lessons[0]?.completed : false;

  const lastPoint = priceHistory[priceHistory.length - 1];
  const priorPoint = priceHistory[priceHistory.length - 2];
  const lastClose = lastPoint?.closePrice ?? null;
  const dayChange = lastClose && priorPoint ? lastClose.minus(priorPoint.closePrice) : null;
  const dayChangePercent =
    dayChange && priorPoint && !priorPoint.closePrice.isZero()
      ? dayChange.dividedBy(priorPoint.closePrice).times(100)
      : null;
  const isGain = dayChange ? dayChange.greaterThanOrEqualTo(0) : true;

  // 5 trading days back (index -6, since index -1 is the latest close) — used
  // only for the Recent News panel's neutral "5-day change" context stat.
  const fiveDaysAgoPoint = priceHistory[priceHistory.length - 6];
  const fiveDayChangePercent =
    lastClose && fiveDaysAgoPoint && !fiveDaysAgoPoint.closePrice.isZero()
      ? lastClose.minus(fiveDaysAgoPoint.closePrice).dividedBy(fiveDaysAgoPoint.closePrice).times(100).toString()
      : null;

  const chartData = priceHistory.map((point) => ({
    date: point.date.toISOString(),
    value: Number(point.closePrice),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-display font-semibold tracking-tight">{security.symbol}</h1>
            <StarButton securityId={security.id} symbol={security.symbol} initialWatched={watched} />
          </div>
          <p className="text-body text-foreground-muted">{security.name}</p>
          <p className="mt-1 text-caption text-foreground-subtle">
            {security.exchange} · {ASSET_TYPE_LABELS[security.assetType]}
          </p>
        </div>
        <div className="text-right">
          <p className="font-financial text-display font-semibold">
            {lastClose ? formatCurrency(lastClose.toString()) : "—"}
          </p>
          {dayChange && dayChangePercent ? (
            <p className={`font-financial text-body ${isGain ? "text-positive" : "text-negative"}`}>
              {formatCurrency(dayChange.toString())} ({formatPercent(dayChangePercent.toString())})
            </p>
          ) : null}
        </div>
      </div>

      {showLearningNudge && introCourse ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-body text-foreground">
            New to {ASSET_TYPE_NUDGE_LABELS[security.assetType]}? Learn the basics in a few short lessons.
          </p>
          <Link
            href={`/learn/${introCourse.id}`}
            className="shrink-0 rounded-md bg-accent-solid px-3 py-1.5 text-caption font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
          >
            Start {introCourse.title} →
          </Link>
        </div>
      ) : null}

      <AnalyticsSection priceHistory={chartData} fundamentals={fundamentals} glossaryTerms={glossaryTerms} />

      <RecentNewsPanel headlines={newsHeadlines} fiveDayChangePercent={fiveDayChangePercent} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6">
          <h2 className="text-title font-semibold">About</h2>
          <p className="text-body text-foreground-muted">{ASSET_TYPE_DESCRIPTIONS[security.assetType]}</p>

          {position ? (
            <div className="rounded-md border border-border bg-background-inset p-4">
              <p className="text-caption text-foreground-muted">Your position</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="font-financial text-body">{formatShares(position.quantity.toString())} shares</span>
                <span className="font-financial text-body">
                  Avg cost {formatCurrency(position.avgCostBasis.toString())}
                </span>
                <span className="font-financial text-body">Value {formatCurrency(position.marketValue.toString())}</span>
                <span
                  className={`font-financial text-body ${
                    position.unrealizedGain.greaterThanOrEqualTo(0) ? "text-positive" : "text-negative"
                  }`}
                >
                  {formatCurrency(position.unrealizedGain.toString())} gain/loss
                </span>
              </div>
            </div>
          ) : (
            <p className="text-caption text-foreground-muted">
              You don&apos;t hold any shares of {security.symbol} yet.
            </p>
          )}
        </section>

        <OrderForm
          security={{ id: security.id, symbol: security.symbol, lastClose: lastClose?.toString() ?? null }}
          cashBalance={account.cashBalance.toString()}
          pricesAsOf={formatAsOfDate(lastPoint?.date ?? null)}
        />
      </div>
    </div>
  );
}
