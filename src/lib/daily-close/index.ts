import type { PrismaClient } from "@prisma/client";

import { checkLeaderboardBadges } from "@/lib/badges";
import { postQuarterlyDividends, type DividendPostingSummary } from "@/lib/dividends";
import { withJobRun } from "@/lib/job-runs";
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
/// `job:daily-close` CLI script, `/api/cron/daily-prices`, and the admin
/// dashboard's manual trigger so there's exactly one implementation of "what
/// a day's close does."
///
/// `offset`/`limit` restrict the PRICE half of this to one batch — see
/// `updateAllClosingPrices`'s doc comment — while pending-order evaluation,
/// dividends, margin maintenance, and the account snapshot always run in
/// full on every call. That's deliberate, not an oversight: those steps are
/// pure-DB and cheap (no external API calls, no rate limit), so re-running
/// them after every batch is harmless and keeps each of them correct-by-the-
/// last-batch-of-the-day regardless of which order Vercel's staggered cron
/// invocations happen to complete in — see DEPLOYMENT.md.
export async function runDailyClose(options?: {
  client?: PrismaClient;
  maxApiCallsPerRun?: number;
  offset?: number;
  limit?: number;
}): Promise<DailyCloseSummary> {
  const client = options?.client ?? defaultPrisma;

  // JobRun "daily-prices": one row per invocation (every cron shard, every
  // admin/CLI run). PARTIAL/FAILED is computed from how many symbols fell
  // back to synthetic for a reason OTHER than being over the daily budget
  // (a budget skip is expected/by-design, not a failure) — see
  // `updateAllClosingPrices`'s doc comment.
  const priceUpdate = await withJobRun(
    "daily-prices",
    () =>
      updateAllClosingPrices({
        client,
        maxApiCallsPerRun: options?.maxApiCallsPerRun,
        offset: options?.offset,
        limit: options?.limit,
      }),
    (summary) => {
      const total = summary.fetchedFromApi.length + summary.synthetic.length;
      const genuineFailures = summary.synthetic.filter((symbol) => !summary.skippedOverDailyBudget.includes(symbol));
      const status = genuineFailures.length === 0 ? "SUCCESS" : genuineFailures.length === total ? "FAILED" : "PARTIAL";
      return { status, symbolsProcessed: total };
    },
    client,
  );

  // Dividends wrap themselves with their own "quarterly-dividends" JobRun
  // (see @/lib/dividends) — covers this embedded call, the standalone
  // /api/cron/quarterly-dividends route, and the admin manual trigger with
  // one shared implementation.
  const dividends = await postQuarterlyDividends(priceUpdate.targetDate, client);

  // JobRun "portfolio-revaluation": pending-order evaluation, margin
  // maintenance, and — the actual "revalue every account against today's
  // prices" step — the AccountValueHistory snapshot loop. Each account is
  // snapshotted independently (try/catch per account) so one account with
  // a broken position/lot doesn't abort snapshotting for every other
  // account — a prior version had no such isolation, meaning a single bad
  // account could silently zero out the whole night's revaluation.
  const { pendingOrders, marginMaintenance, accountsSnapshotted } = await withJobRun(
    "portfolio-revaluation",
    async () => {
      const pendingOrders = await evaluatePendingOrders(client);
      const marginMaintenance = await checkMarginMaintenance(client);

      const accounts = await client.account.findMany({ select: { id: true } });
      const failedAccountIds: string[] = [];

      for (const account of accounts) {
        try {
          const summary = await getPortfolioSummary(account.id, client);
          await recordAccountValueSnapshot(account.id, priceUpdate.targetDate, summary.totalPortfolioValue, client);
        } catch (error) {
          failedAccountIds.push(account.id);
          console.error(`[daily-close] failed to snapshot account ${account.id}:`, error);
        }
      }

      // Rankings only change when new snapshots land, so this only needs to
      // run once per close, after every account above is snapshotted.
      await checkLeaderboardBadges(client);

      return {
        pendingOrders,
        marginMaintenance,
        accountsSnapshotted: accounts.length - failedAccountIds.length,
        totalAccounts: accounts.length,
        failedAccountIds,
      };
    },
    (result) => ({
      status:
        result.failedAccountIds.length === 0
          ? "SUCCESS"
          : result.accountsSnapshotted === 0
            ? "FAILED"
            : "PARTIAL",
      symbolsProcessed: result.accountsSnapshotted,
    }),
    client,
  );

  return { priceUpdate, pendingOrders, dividends, marginMaintenance, accountsSnapshotted };
}
