import type { PrismaClient, Prisma } from "@prisma/client";

import { checkStreakBadges } from "@/lib/badges";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/// Updates a user's login streak — called once per successful credentials
/// sign-in (from `Credentials.authorize()` in `@/lib/auth.ts`, which is
/// Node-only and already does a Prisma lookup; the shared, Edge-safe
/// `auth.config.ts` callbacks must NOT gain a Prisma-backed call like this
/// one, since `middleware.ts` also runs on those callbacks — see
/// ARCHITECTURE.md). A no-op if already recorded today (multiple sign-ins
/// on the same calendar day don't inflate the streak); consecutive calendar
/// days increment it; any gap resets it to 1. Runs the streak-badge check
/// as part of the same update.
export async function recordLogin(userId: string, client: Client = defaultPrisma): Promise<void> {
  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });
  const today = startOfUtcDay(new Date());

  if (user.lastActiveDate) {
    const lastActive = startOfUtcDay(user.lastActiveDate);
    const daysSinceLastActive = Math.round((today.getTime() - lastActive.getTime()) / MILLISECONDS_PER_DAY);

    if (daysSinceLastActive === 0) return;

    const currentStreak = daysSinceLastActive === 1 ? user.currentStreak + 1 : 1;
    const longestStreak = Math.max(user.longestStreak, currentStreak);

    await client.user.update({ where: { id: userId }, data: { lastActiveDate: today, currentStreak, longestStreak } });
    await checkStreakBadges(userId, currentStreak, client);
    return;
  }

  await client.user.update({ where: { id: userId }, data: { lastActiveDate: today, currentStreak: 1, longestStreak: 1 } });
  await checkStreakBadges(userId, 1, client);
}
