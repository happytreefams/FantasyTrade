import { Prisma, type Security } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/prisma";

export async function isWatched(accountId: string, securityId: string, client = defaultPrisma): Promise<boolean> {
  const item = await client.watchlistItem.findUnique({
    where: { accountId_securityId: { accountId, securityId } },
  });
  return !!item;
}

/// Returns the subset of `securityIds` the account has starred, as a Set for
/// fast membership checks when annotating a list of search results.
export async function getWatchedSecurityIds(
  accountId: string,
  securityIds: string[],
  client = defaultPrisma,
): Promise<Set<string>> {
  if (securityIds.length === 0) return new Set();

  const items = await client.watchlistItem.findMany({
    where: { accountId, securityId: { in: securityIds } },
    select: { securityId: true },
  });
  return new Set(items.map((item) => item.securityId));
}

export async function addToWatchlist(accountId: string, securityId: string, client = defaultPrisma): Promise<void> {
  await client.watchlistItem.upsert({
    where: { accountId_securityId: { accountId, securityId } },
    update: {},
    create: { accountId, securityId },
  });
}

export async function removeFromWatchlist(
  accountId: string,
  securityId: string,
  client = defaultPrisma,
): Promise<void> {
  await client.watchlistItem.deleteMany({ where: { accountId, securityId } });
}

export type WatchlistEntry = {
  id: string;
  security: Security;
  lastClose: Prisma.Decimal | null;
  dayChange: Prisma.Decimal;
  dayChangePercent: Prisma.Decimal;
};

/// Starred securities with their latest close and day-over-day change
/// (latest close vs. the prior recorded close).
export async function getWatchlist(accountId: string, client = defaultPrisma): Promise<WatchlistEntry[]> {
  const items = await client.watchlistItem.findMany({
    where: { accountId },
    include: { security: true },
    orderBy: { security: { symbol: "asc" } },
  });

  return Promise.all(
    items.map(async (item) => {
      const recent = await client.priceHistory.findMany({
        where: { securityId: item.securityId },
        orderBy: { date: "desc" },
        take: 2,
      });

      const lastClose = recent[0]?.closePrice ?? null;
      const priorClose = recent[1]?.closePrice ?? null;
      const dayChange = lastClose && priorClose ? lastClose.minus(priorClose) : new Prisma.Decimal(0);
      const dayChangePercent =
        lastClose && priorClose && !priorClose.isZero() ? dayChange.dividedBy(priorClose).times(100) : new Prisma.Decimal(0);

      return { id: item.id, security: item.security, lastClose, dayChange, dayChangePercent };
    }),
  );
}
