import type { PrismaClient } from "@prisma/client";

import { checkLeaderboardBadges } from "@/lib/badges";
import { postQuarterlyDividends, type DividendPostingSummary } from "@/lib/dividends";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { updateAllClosingPrices, type PriceUpdateSummary } from "@/lib/market-data";
import { getPortfolioSummary, recordAccountValueSnapshot } from "@/lib/portfolio";
import {
  checkMarginMaintenance,
  evaluatePendingOrders,
  type MarginMaintenanceSummary,
  type PendingOrderResolutionSummary,
} from "@/lib/trading";

export type DailyCloseSummary = {
  priceUpdate: PriceUpdateSummary;
  pendingOrders: PendingOrderResolutionSummary;
  dividends: DividendPostingSummary;
  marginMaintenance: MarginMaintenanceSummary;
  accountsSnapshotted: number;
};

/// The overnight valuation job's full orchestration: refresh closing prices,
/// resolve every standing LIMIT/STOP_LOSS/STOP_LIMIT order against the new
/// prices, post any quarterly dividends due (reinvesting via DRIP where
/// enabled), mark every margin-enabled account's maintenance status, then
/// snapshot every account's total value for the day. Shared by the
/// `job:daily-close` CLI script and the admin dashboard's manual trigger so
/// there's exactly one implementation of "what a day's close does."
export async function runDailyClose(options?: {
  client?: PrismaClient;
  maxApiCallsPerRun?: number;
}): Promise<DailyCloseSummary> {
  const client = options?.client ?? defaultPrisma;

  const priceUpdate = await updateAllClosingPrices({ client, maxApiCallsPerRun: options?.maxApiCallsPerRun });
  const pendingOrders = await evaluatePendingOrders(client);
  const dividends = await postQuarterlyDividends(priceUpdate.targetDate, client);
  const marginMaintenance = await checkMarginMaintenance(client);

  const accounts = await client.account.findMany({ select: { id: true } });
  for (const account of accounts) {
    const summary = await getPortfolioSummary(account.id, client);
    await recordAccountValueSnapshot(account.id, priceUpdate.targetDate, summary.totalPortfolioValue, client);
  }

  // Rankings only change when new snapshots land, so this only needs to run
  // once per close, after every account above is snapshotted.
  await checkLeaderboardBadges(client);

  return { priceUpdate, pendingOrders, dividends, marginMaintenance, accountsSnapshotted: accounts.length };
}
