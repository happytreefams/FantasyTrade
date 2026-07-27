import { Prisma, type PrismaClient } from "@prisma/client";

import { withJobRun } from "@/lib/job-runs";
import { getLatestPrice } from "@/lib/market-data";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeOrder } from "@/lib/trading";

/// This app has no real dividend declaration/ex-date/payment-date calendar
/// — dividends are simulated. Any held (long) position in a security with a
/// positive `dividendYield` on record (from the weekly fundamentals job) is
/// paid an illustrative quarterly amount, once per (account, security,
/// calendar quarter), by the daily-close job. This is clearly an
/// approximation, not a real corporate action — real dividends are declared
/// per-share dollar amounts on their own schedule, not derived from yield.

/// "2026-Q3" style key for the calendar quarter containing `date`.
export function quarterKey(date: Date): string {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

/// The first calendar day (UTC) of the quarter containing `date` — used to
/// check "has this (account, security) already been paid a dividend this
/// quarter?" without needing a separate quarter-key column.
export function quarterStartDate(date: Date): Date {
  const year = date.getUTCFullYear();
  const quarterIndex = Math.floor(date.getUTCMonth() / 3);
  return new Date(Date.UTC(year, quarterIndex * 3, 1));
}

/// (annualDividendYield * lastClose) / 4 — a simple, clearly illustrative
/// approximation of a quarterly per-share dividend. `annualDividendYield` is
/// a fraction (0.015 for 1.5%), matching `SecurityFundamentals.dividendYield`.
export function computeQuarterlyDividendPerShare(
  annualDividendYield: Prisma.Decimal,
  lastClose: Prisma.Decimal,
): Prisma.Decimal {
  return annualDividendYield.times(lastClose).dividedBy(4);
}

export type DividendPostingSummary = {
  paid: Array<{ symbol: string; totalAmount: string; reinvested: boolean }>;
  failed: Array<{ symbol: string; accountId: string; error: string }>;
};

/// Posts one illustrative dividend per (account, security) held long, for
/// the calendar quarter containing `targetDate` — skipped if already posted
/// this quarter, or if the security has no positive `dividendYield` on
/// record. Short positions never receive a simulated dividend in this
/// simplified model. If the position has `dripEnabled`, the dividend cash is
/// immediately reinvested into more (fractional) shares of the same
/// security via the normal trading engine instead of sitting as cash.
/// Called by the daily-close job after each day's prices are refreshed —
/// cheap to call every day, since the "already paid this quarter" check
/// makes it a no-op on every day but the first one in a new quarter. Also
/// reachable standalone via `/api/cron/quarterly-dividends` and the admin
/// manual trigger — this function wraps itself with a "quarterly-dividends"
/// JobRun (see `@/lib/job-runs`) so all three paths are covered by one
/// implementation.
///
/// Each position is posted independently (try/catch per position): one
/// position throwing (a bad price lookup, a trading-engine error on DRIP
/// reinvestment) no longer aborts the whole run and silently skips every
/// other account's dividend for the day — it's recorded in `failed` and the
/// loop continues.
export async function postQuarterlyDividends(
  targetDate: Date,
  client: PrismaClient = defaultPrisma,
): Promise<DividendPostingSummary> {
  return withJobRun(
    "quarterly-dividends",
    () => postQuarterlyDividendsInner(targetDate, client),
    (summary) => ({
      status: summary.failed.length === 0 ? "SUCCESS" : "PARTIAL",
      symbolsProcessed: summary.paid.length,
    }),
    client,
  );
}

async function postQuarterlyDividendsInner(targetDate: Date, client: PrismaClient): Promise<DividendPostingSummary> {
  const quarterStart = quarterStartDate(targetDate);

  const positions = await client.position.findMany({
    where: { quantity: { gt: 0 } },
    include: { security: { include: { fundamentals: true } } },
  });

  const paid: DividendPostingSummary["paid"] = [];
  const failed: DividendPostingSummary["failed"] = [];

  for (const position of positions) {
    try {
      const dividendYield = position.security.fundamentals?.dividendYield;
      if (!dividendYield || dividendYield.lessThanOrEqualTo(0)) continue;

      const alreadyPaidThisQuarter = await client.dividendPayment.findFirst({
        where: { accountId: position.accountId, securityId: position.securityId, paidAt: { gte: quarterStart } },
      });
      if (alreadyPaidThisQuarter) continue;

      const latest = await getLatestPrice(position.securityId, client);
      if (!latest) continue;

      const amountPerShare = computeQuarterlyDividendPerShare(dividendYield, latest.closePrice);
      if (amountPerShare.lessThanOrEqualTo(0)) continue;

      const totalAmount = amountPerShare.times(position.quantity);

      await client.dividendPayment.create({
        data: {
          accountId: position.accountId,
          securityId: position.securityId,
          sharesHeld: position.quantity,
          amountPerShare,
          totalAmount,
          paidAt: targetDate,
        },
      });

      const account = await client.account.findUniqueOrThrow({ where: { id: position.accountId } });
      await client.account.update({ where: { id: account.id }, data: { cashBalance: account.cashBalance.plus(totalAmount) } });

      let reinvested = false;
      if (position.dripEnabled) {
        const shares = totalAmount.dividedBy(latest.closePrice);
        if (shares.greaterThan(0)) {
          await placeOrder({ accountId: position.accountId, securityId: position.securityId, side: "BUY", quantity: shares }, client);
          reinvested = true;
        }
      }

      paid.push({ symbol: position.security.symbol, totalAmount: totalAmount.toString(), reinvested });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[dividends] failed to post dividend for account ${position.accountId} / ${position.security.symbol}:`, error);
      failed.push({ symbol: position.security.symbol, accountId: position.accountId, error: message });
    }
  }

  return { paid, failed };
}

/// The public contract this module fulfills for the rest of the app.
export interface DividendsService {
  postQuarterlyDividends: typeof postQuarterlyDividends;
  computeQuarterlyDividendPerShare: typeof computeQuarterlyDividendPerShare;
}
