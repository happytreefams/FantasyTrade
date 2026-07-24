import { Prisma, type Order, type PendingOrder, type Security } from "@prisma/client";

import { RISK_FREE_RATE } from "@/lib/constants";
import { getLatestPrice } from "@/lib/market-data";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type PositionSummary = {
  id: string;
  security: Security;
  quantity: Prisma.Decimal;
  avgCostBasis: Prisma.Decimal;
  dripEnabled: boolean;
  lastClose: Prisma.Decimal | null;
  marketValue: Prisma.Decimal;
  unrealizedGain: Prisma.Decimal;
  unrealizedGainPercent: Prisma.Decimal;
};

export type PortfolioSummary = {
  cashBalance: Prisma.Decimal;
  positions: PositionSummary[];
  totalMarketValue: Prisma.Decimal;
  totalPortfolioValue: Prisma.Decimal;
};

/// Aggregates an account's cash + holdings into current portfolio value.
/// Market value is computed from the latest close on record (no intraday
/// pricing in this tier).
export async function getPortfolioSummary(accountId: string, client = defaultPrisma): Promise<PortfolioSummary> {
  const account = await client.account.findUniqueOrThrow({ where: { id: accountId } });
  const positions = await client.position.findMany({
    where: { accountId },
    include: { security: true },
    orderBy: { security: { symbol: "asc" } },
  });

  const positionSummaries: PositionSummary[] = await Promise.all(
    positions.map(async (position) => {
      const latest = await getLatestPrice(position.securityId, client);
      const lastClose = latest?.closePrice ?? null;
      const marketValue = lastClose ? lastClose.times(position.quantity) : new Prisma.Decimal(0);
      const costTotal = position.avgCostBasis.times(position.quantity);
      const unrealizedGain = marketValue.minus(costTotal);
      const unrealizedGainPercent = costTotal.isZero()
        ? new Prisma.Decimal(0)
        : unrealizedGain.dividedBy(costTotal).times(100);

      return {
        id: position.id,
        security: position.security,
        quantity: position.quantity,
        avgCostBasis: position.avgCostBasis,
        dripEnabled: position.dripEnabled,
        lastClose,
        marketValue,
        unrealizedGain,
        unrealizedGainPercent,
      };
    }),
  );

  const totalMarketValue = positionSummaries.reduce(
    (sum, position) => sum.plus(position.marketValue),
    new Prisma.Decimal(0),
  );

  return {
    cashBalance: account.cashBalance,
    positions: positionSummaries,
    totalMarketValue,
    totalPortfolioValue: account.cashBalance.plus(totalMarketValue),
  };
}

export type Position = {
  quantity: Prisma.Decimal;
  avgCostBasis: Prisma.Decimal;
  marketValue: Prisma.Decimal;
  unrealizedGain: Prisma.Decimal;
};

/// A single account/security holding — used by the security detail page to
/// show "you own N shares" alongside its buy/sell panel.
export async function getPosition(
  accountId: string,
  securityId: string,
  client = defaultPrisma,
): Promise<Position | null> {
  const position = await client.position.findUnique({
    where: { accountId_securityId: { accountId, securityId } },
  });
  if (!position) return null;

  const latest = await getLatestPrice(securityId, client);
  const lastClose = latest?.closePrice ?? null;
  const marketValue = lastClose ? lastClose.times(position.quantity) : new Prisma.Decimal(0);
  const unrealizedGain = marketValue.minus(position.avgCostBasis.times(position.quantity));

  return {
    quantity: position.quantity,
    avgCostBasis: position.avgCostBasis,
    marketValue,
    unrealizedGain,
  };
}

export type TopMover = {
  security: Security;
  lastClose: Prisma.Decimal;
  dayChange: Prisma.Decimal;
  dayChangePercent: Prisma.Decimal;
};

/// Held positions ranked by day-over-day price change (largest absolute %
/// move first) — powers the dashboard's "top movers" list. Positions whose
/// security doesn't have at least two recorded closes yet are excluded.
export async function getTopMovers(accountId: string, limit = 5, client = defaultPrisma): Promise<TopMover[]> {
  const positions = await client.position.findMany({ where: { accountId }, include: { security: true } });

  const movers = await Promise.all(
    positions.map(async (position): Promise<TopMover | null> => {
      const recent = await client.priceHistory.findMany({
        where: { securityId: position.securityId },
        orderBy: { date: "desc" },
        take: 2,
      });
      const lastClose = recent[0]?.closePrice;
      const priorClose = recent[1]?.closePrice;
      if (!lastClose || !priorClose) return null;

      const dayChange = lastClose.minus(priorClose);
      const dayChangePercent = priorClose.isZero() ? new Prisma.Decimal(0) : dayChange.dividedBy(priorClose).times(100);

      return { security: position.security, lastClose, dayChange, dayChangePercent };
    }),
  );

  return movers
    .filter((mover): mover is TopMover => mover !== null)
    .sort((a, b) => b.dayChangePercent.abs().comparedTo(a.dayChangePercent.abs()))
    .slice(0, limit);
}

export type OrderWithSecurity = Order & { security: Security };

export async function getOrderHistory(
  accountId: string,
  limit = 50,
  client = defaultPrisma,
): Promise<OrderWithSecurity[]> {
  return client.order.findMany({
    where: { accountId },
    include: { security: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export type PendingOrderWithSecurity = PendingOrder & { security: Security };

/// Every still-active (PENDING) LIMIT/STOP_LOSS/STOP_LIMIT order for an
/// account, most recent first — powers the /portfolio "Pending Orders" tab
/// (view + cancel; cancellation itself is `@/lib/trading`'s
/// `cancelPendingOrder`). Once one fills, expires, or is cancelled it drops
/// out of this list — a fill is already visible in the Order history tab.
export async function getPendingOrders(
  accountId: string,
  client = defaultPrisma,
): Promise<PendingOrderWithSecurity[]> {
  return client.pendingOrder.findMany({
    where: { accountId, status: "PENDING" },
    include: { security: true },
    orderBy: { createdAt: "desc" },
  });
}

export type AccountValueSnapshot = {
  date: Date;
  totalValue: Prisma.Decimal;
};

/// Ascending-by-date daily portfolio value snapshots, written by the
/// overnight valuation job — powers the dashboard's performance chart.
export async function getAccountValueHistory(
  accountId: string,
  days = 30,
  client = defaultPrisma,
): Promise<AccountValueSnapshot[]> {
  const rows = await client.accountValueHistory.findMany({
    where: { accountId },
    orderBy: { date: "desc" },
    take: days,
  });

  return rows.map((row) => ({ date: row.date, totalValue: row.totalValue })).reverse();
}

/// Writes (or overwrites) today's — or any given date's — total portfolio
/// value snapshot for an account. Called by the daily-close job after prices
/// have been refreshed for the day.
export async function recordAccountValueSnapshot(
  accountId: string,
  date: Date,
  totalValue: Prisma.Decimal,
  client = defaultPrisma,
): Promise<void> {
  await client.accountValueHistory.upsert({
    where: { accountId_date: { accountId, date } },
    update: { totalValue },
    create: { accountId, date, totalValue },
  });
}

export type BenchmarkComparisonPoint = { date: string; accountIndexed: number; benchmarkIndexed: number };

/// Pairs the account's daily value history with a benchmark security's daily
/// closes over the same span, both rebased to 100 at the account's earliest
/// recorded snapshot — the shape the /portfolio performance chart's
/// benchmark overlay and `getRiskMetrics` both consume. Only dates present
/// in *both* series are included, so a gap in either (e.g. the benchmark's
/// price history not reaching as far back as the account's inception) never
/// desyncs the two lines. Returns an empty array if there's no anchor point
/// to rebase from (no account history yet, or the benchmark has no price on
/// the account's first snapshot date).
export async function getBenchmarkComparison(
  accountId: string,
  benchmarkSymbol: string,
  client = defaultPrisma,
): Promise<BenchmarkComparisonPoint[]> {
  const accountHistory = await client.accountValueHistory.findMany({ where: { accountId }, orderBy: { date: "asc" } });
  if (accountHistory.length === 0) return [];

  const benchmarkSecurity = await client.security.findUnique({ where: { symbol: benchmarkSymbol } });
  if (!benchmarkSecurity) return [];

  const benchmarkHistory = await client.priceHistory.findMany({
    where: { securityId: benchmarkSecurity.id, date: { gte: accountHistory[0].date } },
    orderBy: { date: "asc" },
  });
  const benchmarkByDateKey = new Map(benchmarkHistory.map((row) => [row.date.toISOString().slice(0, 10), row.closePrice]));

  const firstAccountValue = accountHistory[0].totalValue;
  const firstBenchmarkClose = benchmarkByDateKey.get(accountHistory[0].date.toISOString().slice(0, 10));
  if (!firstBenchmarkClose || firstBenchmarkClose.isZero() || firstAccountValue.isZero()) return [];

  const points: BenchmarkComparisonPoint[] = [];
  for (const snapshot of accountHistory) {
    const benchmarkClose = benchmarkByDateKey.get(snapshot.date.toISOString().slice(0, 10));
    if (!benchmarkClose) continue;

    points.push({
      date: snapshot.date.toISOString(),
      accountIndexed: Number(snapshot.totalValue.dividedBy(firstAccountValue).times(100)),
      benchmarkIndexed: Number(benchmarkClose.dividedBy(firstBenchmarkClose).times(100)),
    });
  }

  return points;
}

const MIN_HISTORY_POINTS_FOR_RISK_METRICS = 30;
const TRADING_DAYS_PER_YEAR = 252;

export type RiskMetrics =
  | { status: "insufficient-history"; daysRecorded: number; daysNeeded: number }
  | { status: "ready"; volatility: number; beta: number; sharpeRatio: number; dataPoints: number };

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[], average: number): number {
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
}

/// Volatility (annualized standard deviation of daily returns), beta
/// (covariance of portfolio vs. benchmark daily returns ÷ benchmark
/// variance), and Sharpe ratio (excess annualized return over
/// `RISK_FREE_RATE`, per unit of volatility) — pure math over an already
/// date-aligned series, split out from `getRiskMetrics` so it's testable
/// without a database. Rebasing to 100 doesn't change day-over-day %
/// returns, so this works directly off `getBenchmarkComparison`'s output.
export function computeRiskMetrics(points: BenchmarkComparisonPoint[]): RiskMetrics {
  if (points.length < MIN_HISTORY_POINTS_FOR_RISK_METRICS) {
    return {
      status: "insufficient-history",
      daysRecorded: points.length,
      daysNeeded: MIN_HISTORY_POINTS_FOR_RISK_METRICS,
    };
  }

  const portfolioReturns: number[] = [];
  const benchmarkReturns: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    portfolioReturns.push((points[i].accountIndexed - points[i - 1].accountIndexed) / points[i - 1].accountIndexed);
    benchmarkReturns.push((points[i].benchmarkIndexed - points[i - 1].benchmarkIndexed) / points[i - 1].benchmarkIndexed);
  }

  const portfolioMean = mean(portfolioReturns);
  const benchmarkMean = mean(benchmarkReturns);
  const benchmarkVariance = variance(benchmarkReturns, benchmarkMean);
  const covariance =
    portfolioReturns.reduce((sum, value, i) => sum + (value - portfolioMean) * (benchmarkReturns[i] - benchmarkMean), 0) /
    portfolioReturns.length;

  const annualizedVolatility = Math.sqrt(variance(portfolioReturns, portfolioMean)) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const beta = benchmarkVariance === 0 ? 0 : covariance / benchmarkVariance;
  const annualizedReturn = portfolioMean * TRADING_DAYS_PER_YEAR;
  const sharpeRatio = annualizedVolatility === 0 ? 0 : (annualizedReturn - RISK_FREE_RATE) / annualizedVolatility;

  return { status: "ready", volatility: annualizedVolatility, beta, sharpeRatio, dataPoints: points.length };
}

/// Needs at least `MIN_HISTORY_POINTS_FOR_RISK_METRICS` aligned daily
/// snapshots; returns an "insufficient-history" status otherwise rather than
/// a noisy/misleading figure from too few data points.
export async function getRiskMetrics(
  accountId: string,
  benchmarkSymbol: string,
  client = defaultPrisma,
): Promise<RiskMetrics> {
  const points = await getBenchmarkComparison(accountId, benchmarkSymbol, client);
  return computeRiskMetrics(points);
}

const SECTOR_LABELS: Record<string, string> = {
  TECHNOLOGY: "Technology",
  FINANCIAL_SERVICES: "Financial Services",
  COMMUNICATION_SERVICES: "Communication Services",
  CONSUMER_CYCLICAL: "Consumer Cyclical",
  CONSUMER_DEFENSIVE: "Consumer Defensive",
  HEALTHCARE: "Healthcare",
  ENERGY: "Energy",
  INDUSTRIALS: "Industrials",
};

const SECTOR_ALLOCATION_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-accent)",
  "var(--color-positive)",
  "var(--color-border-strong)",
];

export type SectorAllocationSlice = { label: string; value: number; color: string };

/// Portfolio value grouped by sector for stocks/ETFs with fundamentals
/// coverage; bonds and commodities are grouped by asset type instead of
/// forcing them into a "sector," since that classification doesn't apply the
/// same way to a fixed-income or commodity ETF proxy. A stock/ETF without
/// sector coverage yet (fundamentals never fetched, or an ETF the provider
/// doesn't classify) falls into "Other / Uncategorized" rather than being
/// dropped from the chart.
export async function getSectorAllocation(accountId: string, client = defaultPrisma): Promise<SectorAllocationSlice[]> {
  const positions = await client.position.findMany({
    where: { accountId },
    include: { security: { include: { fundamentals: true } } },
  });

  const valueByCategory = new Map<string, number>();

  for (const position of positions) {
    const latest = await getLatestPrice(position.securityId, client);
    const marketValue = latest ? Number(latest.closePrice.times(position.quantity)) : 0;
    if (marketValue <= 0) continue;

    let category: string;
    if (position.security.assetType === "BOND") {
      category = "Bonds";
    } else if (position.security.assetType === "COMMODITY") {
      category = "Commodities";
    } else {
      const sector = position.security.fundamentals?.sector;
      category = sector ? (SECTOR_LABELS[sector] ?? sector) : "Other / Uncategorized";
    }

    valueByCategory.set(category, (valueByCategory.get(category) ?? 0) + marketValue);
  }

  return [...valueByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({ label, value, color: SECTOR_ALLOCATION_COLORS[index % SECTOR_ALLOCATION_COLORS.length] }));
}

const LONG_TERM_HOLDING_DAYS = 365;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export type OpenLot = {
  id: string;
  security: Security;
  quantity: Prisma.Decimal;
  costBasis: Prisma.Decimal;
  purchaseDate: Date;
  lastClose: Prisma.Decimal | null;
  marketValue: Prisma.Decimal;
  unrealizedGain: Prisma.Decimal;
  holdingPeriodDays: number;
  term: "SHORT_TERM" | "LONG_TERM";
};

/// Every still-open purchase lot for an account — the "Tax Lots" half of the
/// simulated capital-gains report. `PositionLot` is the source of truth here
/// (see `@/lib/trading`); this just annotates each lot with its current
/// unrealized gain/loss and how long it's been held so far.
export async function getOpenPositionLots(accountId: string, client = defaultPrisma): Promise<OpenLot[]> {
  const lots = await client.positionLot.findMany({
    where: { accountId, quantity: { gt: 0 } },
    include: { security: true },
    orderBy: [{ security: { symbol: "asc" } }, { purchaseDate: "asc" }],
  });

  const now = new Date();

  return Promise.all(
    lots.map(async (lot) => {
      const latest = await getLatestPrice(lot.securityId, client);
      const lastClose = latest?.closePrice ?? null;
      const marketValue = lastClose ? lastClose.times(lot.quantity) : new Prisma.Decimal(0);
      const unrealizedGain = marketValue.minus(lot.costBasis.times(lot.quantity));
      const holdingPeriodDays = Math.floor((now.getTime() - lot.purchaseDate.getTime()) / MILLISECONDS_PER_DAY);

      return {
        id: lot.id,
        security: lot.security,
        quantity: lot.quantity,
        costBasis: lot.costBasis,
        purchaseDate: lot.purchaseDate,
        lastClose,
        marketValue,
        unrealizedGain,
        holdingPeriodDays,
        term: holdingPeriodDays >= LONG_TERM_HOLDING_DAYS ? ("LONG_TERM" as const) : ("SHORT_TERM" as const),
      };
    }),
  );
}

export type RealizedGainRow = {
  id: string;
  security: Security;
  quantity: Prisma.Decimal;
  costBasis: Prisma.Decimal;
  proceeds: Prisma.Decimal;
  gainLoss: Prisma.Decimal;
  holdingPeriodDays: number;
  term: "SHORT_TERM" | "LONG_TERM";
  closedAt: Date;
};

export type RealizedGainsSummary = {
  rows: RealizedGainRow[];
  shortTermTotal: Prisma.Decimal;
  longTermTotal: Prisma.Decimal;
  totalGainLoss: Prisma.Decimal;
};

/// Every lot (or partial lot) closed by a SELL during calendar year `year` —
/// the "Realized Gains" half of the simulated capital-gains report, with a
/// short-term/long-term breakdown. This is a simplified, educational report:
/// real tax treatment (short/long-term rates, inclusion rates, what counts
/// as a taxable account at all) depends on jurisdiction and account type —
/// see the disclaimer on the Tax Lots page.
export async function getRealizedGainsForYear(
  accountId: string,
  year: number,
  client = defaultPrisma,
): Promise<RealizedGainsSummary> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const rows = await client.realizedGain.findMany({
    where: { accountId, closedAt: { gte: start, lt: end } },
    include: { security: true },
    orderBy: { closedAt: "desc" },
  });

  const shortTermTotal = rows
    .filter((row) => row.term === "SHORT_TERM")
    .reduce((sum, row) => sum.plus(row.gainLoss), new Prisma.Decimal(0));
  const longTermTotal = rows
    .filter((row) => row.term === "LONG_TERM")
    .reduce((sum, row) => sum.plus(row.gainLoss), new Prisma.Decimal(0));

  return { rows, shortTermTotal, longTermTotal, totalGainLoss: shortTermTotal.plus(longTermTotal) };
}

/// The public contract this module fulfills for the rest of the app — kept
/// here as a compile-time check that the module's shape stays stable for UI
/// consumers. Purely a read-side aggregation layer over positions/orders
/// written by `@/lib/trading`; adding a new asset type or account type
/// doesn't require touching these signatures. See ARCHITECTURE.md.
export interface PortfolioService {
  getPortfolioSummary: typeof getPortfolioSummary;
  getPosition: typeof getPosition;
  getTopMovers: typeof getTopMovers;
  getOrderHistory: typeof getOrderHistory;
  getPendingOrders: typeof getPendingOrders;
  getAccountValueHistory: typeof getAccountValueHistory;
  recordAccountValueSnapshot: typeof recordAccountValueSnapshot;
  getBenchmarkComparison: typeof getBenchmarkComparison;
  getRiskMetrics: typeof getRiskMetrics;
  getSectorAllocation: typeof getSectorAllocation;
  getOpenPositionLots: typeof getOpenPositionLots;
  getRealizedGainsForYear: typeof getRealizedGainsForYear;
}
