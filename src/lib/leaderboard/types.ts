export type LeaderboardPeriod = "WEEKLY" | "MONTHLY" | "ALL_TIME";

export const LEADERBOARD_PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  WEEKLY: "This Week",
  MONTHLY: "This Month",
  ALL_TIME: "All-Time",
};

export type LeaderboardEntry = {
  accountId: string;
  /// Never the user's real `name` or `email` — `displayName` if the user set
  /// one, otherwise a stable id-derived placeholder (never a blank/duplicate
  /// "Anonymous" label across multiple opted-in-but-unnamed accounts).
  displayName: string;
  returnPercent: number;
};
