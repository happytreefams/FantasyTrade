import type { Badge, PrismaClient, Prisma, UserBadge } from "@prisma/client";

import { getLeaderboard, type LeaderboardPeriod } from "@/lib/leaderboard";
import { getCourseCatalog } from "@/lib/learning";
import { getSectorAllocation } from "@/lib/portfolio";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

export const BADGE_CODES = {
  FIRST_TRADE: "FIRST_TRADE",
  FIRST_SHORT_SALE: "FIRST_SHORT_SALE",
  DIVERSIFIED_PORTFOLIO: "DIVERSIFIED_PORTFOLIO",
  FIRST_COURSE_COMPLETE: "FIRST_COURSE_COMPLETE",
  PERSONAL_FINANCE_MASTER: "PERSONAL_FINANCE_MASTER",
  STREAK_7_DAY: "STREAK_7_DAY",
  STREAK_30_DAY: "STREAK_30_DAY",
  TOP_10_LEADERBOARD: "TOP_10_LEADERBOARD",
} as const;

const DIVERSIFIED_PORTFOLIO_MIN_SECTORS = 5;
const LEADERBOARD_TOP_N = 10;

/// Idempotently grants `code` to `userId` — a no-op if the badge doesn't
/// exist yet (not seeded) or the user already has it (`@@unique([userId,
/// badgeId])` means the upsert's `update: {}` just returns the existing
/// row rather than erroring).
export async function awardBadge(userId: string, code: string, client: Client = defaultPrisma): Promise<UserBadge | null> {
  const badge = await client.badge.findUnique({ where: { code } });
  if (!badge) return null;

  return client.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    update: {},
    create: { userId, badgeId: badge.id },
  });
}

export async function getEarnedBadges(userId: string, client: Client = defaultPrisma): Promise<(UserBadge & { badge: Badge })[]> {
  return client.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });
}

export async function getAllBadges(client: Client = defaultPrisma): Promise<Badge[]> {
  return client.badge.findMany({ orderBy: { name: "asc" } });
}

export type BadgeDisplayEntry = {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: Date | null;
};

/// Every seeded badge, annotated with whether `userId` has earned it —
/// earned first, then locked, so the dashboard/profile shelf leads with
/// what the user has actually accomplished. Locked entries still carry
/// their `description` (doubling as the unlock criteria) for the greyed-out
/// "how to earn this" nudge.
export async function getBadgeDisplayList(userId: string, client: Client = defaultPrisma): Promise<BadgeDisplayEntry[]> {
  const [allBadges, earnedBadges] = await Promise.all([getAllBadges(client), getEarnedBadges(userId, client)]);
  const earnedAtByBadgeId = new Map(earnedBadges.map((entry) => [entry.badgeId, entry.earnedAt]));

  return allBadges
    .map((badge) => ({
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: earnedAtByBadgeId.has(badge.id),
      earnedAt: earnedAtByBadgeId.get(badge.id) ?? null,
    }))
    .sort((a, b) => Number(b.earned) - Number(a.earned));
}

/// Checked right after a MARKET order fills (`POST /api/trade`) — not after
/// a standing LIMIT/STOP_LOSS/STOP_LIMIT order fills later via the
/// daily-close job's `evaluatePendingOrders`, which doesn't currently carry
/// enough per-fill account/user context to re-run these cheaply. A user
/// whose very first fill happens that way won't see FIRST_TRADE/
/// FIRST_SHORT_SALE/DIVERSIFIED_PORTFOLIO awarded until their next MARKET
/// trade — a known, minor gap, not a design decision to build around.
export async function checkTradeBadges(userId: string, accountId: string, client: Client = defaultPrisma): Promise<void> {
  const filledOrderCount = await client.order.count({ where: { accountId, status: "FILLED" } });
  if (filledOrderCount >= 1) {
    await awardBadge(userId, BADGE_CODES.FIRST_TRADE, client);
  }

  const openShortLotCount = await client.positionLot.count({ where: { accountId, direction: "SHORT" } });
  if (openShortLotCount >= 1) {
    await awardBadge(userId, BADGE_CODES.FIRST_SHORT_SALE, client);
  }

  const allocation = await getSectorAllocation(accountId, client as PrismaClient);
  if (allocation.length >= DIVERSIFIED_PORTFOLIO_MIN_SECTORS) {
    await awardBadge(userId, BADGE_CODES.DIVERSIFIED_PORTFOLIO, client);
  }
}

/// Checked after a lesson is marked complete (course completion is
/// lesson-based only — see `CourseWithProgress.percentComplete` — so a quiz
/// attempt alone can't flip a course from incomplete to complete).
export async function checkCourseCompletionBadges(userId: string, client: Client = defaultPrisma): Promise<void> {
  const catalog = await getCourseCatalog(userId, client as PrismaClient);

  if (catalog.some((course) => course.percentComplete === 100)) {
    await awardBadge(userId, BADGE_CODES.FIRST_COURSE_COMPLETE, client);
  }

  const personalFinanceCourses = catalog.filter((course) => course.category === "PERSONAL_FINANCE");
  if (personalFinanceCourses.length > 0 && personalFinanceCourses.every((course) => course.percentComplete === 100)) {
    await awardBadge(userId, BADGE_CODES.PERSONAL_FINANCE_MASTER, client);
  }
}

/// Checked from `@/lib/streaks`'s `recordLogin` right after `currentStreak`
/// is updated.
export async function checkStreakBadges(userId: string, currentStreak: number, client: Client = defaultPrisma): Promise<void> {
  if (currentStreak >= 7) {
    await awardBadge(userId, BADGE_CODES.STREAK_7_DAY, client);
  }
  if (currentStreak >= 30) {
    await awardBadge(userId, BADGE_CODES.STREAK_30_DAY, client);
  }
}

const ALL_LEADERBOARD_PERIODS: LeaderboardPeriod[] = ["WEEKLY", "MONTHLY", "ALL_TIME"];

/// Checked once per daily-close run (rankings only change when new
/// AccountValueHistory snapshots land) — awards TOP_10_LEADERBOARD to every
/// account currently in the top 10 of any period.
export async function checkLeaderboardBadges(client: PrismaClient = defaultPrisma): Promise<void> {
  const topAccountIds = new Set<string>();
  for (const period of ALL_LEADERBOARD_PERIODS) {
    const top = await getLeaderboard(period, LEADERBOARD_TOP_N, client);
    for (const entry of top) topAccountIds.add(entry.accountId);
  }
  if (topAccountIds.size === 0) return;

  const accounts = await client.account.findMany({
    where: { id: { in: [...topAccountIds] } },
    select: { userId: true },
  });

  for (const account of accounts) {
    await awardBadge(account.userId, BADGE_CODES.TOP_10_LEADERBOARD, client);
  }
}
