import type { FeatureFlag, Prisma, PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

/// The known set of not-yet-built or optional features this app anticipates.
/// Adding a new future feature means adding one entry here (so it shows up
/// in /admin and gets seeded) plus, inside that feature's own code, calling
/// `isFeatureEnabled("the_key")` wherever it needs to check whether it's
/// switched on — no other module needs to change. See ARCHITECTURE.md.
export const FEATURE_FLAG_DEFINITIONS: Record<string, string> = {
  leaderboards: "Compare portfolio performance against other users.",
  social_friends: "Add friends and see their (opt-in) trading activity.",
  options_trading: "Buy/sell simulated options contracts, not just shares.",
  crypto_trading: "Trade a simulated crypto asset class alongside stocks/ETFs.",
  recurring_deposits: "Automatic scheduled deposits of fake cash into an account.",
  account_reset: "Let a user reset their account back to the starting balance.",
  multiple_accounts: "Support more than one brokerage account per user.",
};

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_DEFINITIONS;

/// Whether a feature flag is currently on. Unknown or never-seeded keys
/// default to false (fail closed) so a typo'd key can't accidentally enable
/// something.
export async function isFeatureEnabled(key: string, client: Client = defaultPrisma): Promise<boolean> {
  const flag = await client.featureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? false;
}

/// All feature flags known to the app, DB state merged with any definitions
/// that haven't been seeded yet (shown as off) — powers the /admin toggle
/// list so a newly added definition appears immediately without re-seeding.
export async function getAllFeatureFlags(client: Client = defaultPrisma): Promise<FeatureFlag[]> {
  const rows = await client.featureFlag.findMany({ orderBy: { key: "asc" } });
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));

  const merged: FeatureFlag[] = Object.entries(FEATURE_FLAG_DEFINITIONS).map(([key, description]) => {
    const existing = rowsByKey.get(key);
    if (existing) return existing;
    return { key, description, enabled: false, updatedAt: new Date() };
  });

  return merged.sort((a, b) => a.key.localeCompare(b.key));
}

/// Flips a feature flag on/off, creating its row (with the description from
/// `FEATURE_FLAG_DEFINITIONS` if known) on first toggle.
export async function setFeatureFlagEnabled(
  key: string,
  enabled: boolean,
  client: Client = defaultPrisma,
): Promise<FeatureFlag> {
  const description = FEATURE_FLAG_DEFINITIONS[key] ?? key;
  return client.featureFlag.upsert({
    where: { key },
    update: { enabled },
    create: { key, enabled, description },
  });
}

export interface FeatureFlagService {
  isFeatureEnabled: typeof isFeatureEnabled;
  getAllFeatureFlags: typeof getAllFeatureFlags;
  setFeatureFlagEnabled: typeof setFeatureFlagEnabled;
}
