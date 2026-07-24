export type BadgeDefinition = {
  code: string;
  name: string;
  description: string;
  icon: string;
};

/// Achievement definitions — seeded content (admin-lite, same pattern as
/// `seed-glossary.ts`), upserted by `code` (not by `id`, since `Badge.id` is
/// a plain cuid — see the schema doc comment). Re-run the seed to add/edit
/// a badge's name/description/icon; the `code` a badge is checked against
/// in `@/lib/badges` must match one of these exactly.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    code: "FIRST_TRADE",
    name: "First Trade",
    description: "Placed your first trade.",
    icon: "🎯",
  },
  {
    code: "FIRST_SHORT_SALE",
    name: "Short Seller",
    description: "Opened your first short sale.",
    icon: "🐻",
  },
  {
    code: "DIVERSIFIED_PORTFOLIO",
    name: "Diversified",
    description: "Held positions across 5 or more sectors at once.",
    icon: "🌐",
  },
  {
    code: "FIRST_COURSE_COMPLETE",
    name: "Graduate",
    description: "Completed your first course.",
    icon: "🎓",
  },
  {
    code: "PERSONAL_FINANCE_MASTER",
    name: "Personal Finance Master",
    description: "Completed every Personal Finance course.",
    icon: "💰",
  },
  {
    code: "STREAK_7_DAY",
    name: "7-Day Streak",
    description: "Logged in 7 days in a row.",
    icon: "🔥",
  },
  {
    code: "STREAK_30_DAY",
    name: "30-Day Streak",
    description: "Logged in 30 days in a row.",
    icon: "🏆",
  },
  {
    code: "TOP_10_LEADERBOARD",
    name: "Top 10",
    description: "Finished in the top 10 on the public leaderboard.",
    icon: "🥇",
  },
];
