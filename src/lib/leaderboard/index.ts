import type { PrismaClient, Prisma } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/prisma";

// Re-exported (not re-declared) so existing server-side imports of these
// two names from "@/lib/leaderboard" keep working. Client components
// should import them from "@/lib/leaderboard/types" directly instead — that
// file has no Prisma import, unlike this one, so it's safe to pull into a
// browser bundle. Importing a *value* (not just a type) from this file
// would drag the whole module's Prisma/`pg` import chain into the client
// bundle (Node-only `net`/`tls` built-ins with no browser equivalent) — see
// `src/components/leaderboard-table.tsx` for the client-side consumer.
export { LEADERBOARD_PERIOD_LABELS } from "./types";
export type { LeaderboardEntry, LeaderboardPeriod } from "./types";

import type { LeaderboardEntry, LeaderboardPeriod } from "./types";

type Client = PrismaClient | Prisma.TransactionClient;

const PERIOD_LOOKBACK_DAYS: Record<Exclude<LeaderboardPeriod, "ALL_TIME">, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
};

/// Ranks every opted-in (`isPublicOnLeaderboard`) account by % return over
/// `period`, computed from `AccountValueHistory` snapshots. WEEKLY/MONTHLY
/// compare the latest snapshot against the closest snapshot at or before
/// `period`'s lookback window; ALL_TIME compares against the account's
/// first-ever snapshot. An account with fewer than two snapshots yet (too
/// new to have a return) is excluded rather than shown with a fake 0%.
export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit = 100,
  client: Client = defaultPrisma,
): Promise<LeaderboardEntry[]> {
  const accounts = await client.account.findMany({
    where: { isPublicOnLeaderboard: true },
    include: {
      user: { select: { displayName: true } },
      valueHistory: { orderBy: { date: "asc" } },
    },
  });

  const entries: LeaderboardEntry[] = [];

  for (const account of accounts) {
    const history = account.valueHistory;
    if (history.length < 2) continue;

    const latest = history[history.length - 1];

    let baseline = history[0];
    if (period !== "ALL_TIME") {
      const cutoff = new Date(latest.date);
      cutoff.setUTCDate(cutoff.getUTCDate() - PERIOD_LOOKBACK_DAYS[period]);
      const withinWindow = [...history].reverse().find((snapshot) => snapshot.date <= cutoff);
      baseline = withinWindow ?? history[0];
    }

    if (baseline.totalValue.isZero()) continue;

    const returnPercent = Number(
      latest.totalValue.minus(baseline.totalValue).dividedBy(baseline.totalValue).times(100),
    );

    entries.push({
      accountId: account.id,
      displayName: account.user.displayName || `Trader-${account.id.slice(-6)}`,
      returnPercent,
    });
  }

  return entries.sort((a, b) => b.returnPercent - a.returnPercent).slice(0, limit);
}

/// A single account's leaderboard settings, read/written from Settings.
export type LeaderboardSettings = {
  isPublicOnLeaderboard: boolean;
  displayName: string | null;
};

export async function getLeaderboardSettings(
  accountId: string,
  userId: string,
  client: Client = defaultPrisma,
): Promise<LeaderboardSettings> {
  const [account, user] = await Promise.all([
    client.account.findUniqueOrThrow({ where: { id: accountId }, select: { isPublicOnLeaderboard: true } }),
    client.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true } }),
  ]);

  return { isPublicOnLeaderboard: account.isPublicOnLeaderboard, displayName: user.displayName };
}

/// Opting in requires a non-blank `displayName` — enforced here (not just in
/// the UI) so a direct API call can't publish an account under a fallback
/// label the user never chose. Blanking `displayName` back out is allowed at
/// any time regardless of opt-in state.
export async function updateLeaderboardSettings(
  accountId: string,
  userId: string,
  input: { isPublicOnLeaderboard: boolean; displayName: string | null },
  client: Client = defaultPrisma,
): Promise<void> {
  const displayName = input.displayName?.trim() || null;
  if (input.isPublicOnLeaderboard && !displayName) {
    throw new Error("Set a display name before opting into the public leaderboard.");
  }

  await client.$transaction([
    client.user.update({ where: { id: userId }, data: { displayName } }),
    client.account.update({ where: { id: accountId }, data: { isPublicOnLeaderboard: input.isPublicOnLeaderboard } }),
  ]);
}
