import Link from "next/link";

import { LeaderboardTable } from "@/components/leaderboard-table";
import { requireAccount } from "@/lib/current-account";
import { getLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from "@/lib/leaderboard";

export default async function LeaderboardPage() {
  const { account } = await requireAccount();

  const [weekly, monthly, allTime] = await Promise.all([
    getLeaderboard("WEEKLY"),
    getLeaderboard("MONTHLY"),
    getLeaderboard("ALL_TIME"),
  ]);

  const entriesByPeriod: Record<LeaderboardPeriod, LeaderboardEntry[]> = {
    WEEKLY: weekly,
    MONTHLY: monthly,
    ALL_TIME: allTime,
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-body text-foreground-muted">
          Ranked by % return — opt-in only. Nobody appears here unless they&apos;ve turned on{" "}
          <Link href="/settings" className="text-accent hover:underline">
            public leaderboard visibility
          </Link>{" "}
          in Settings, and only their chosen display name is ever shown.
        </p>
      </div>

      <LeaderboardTable entriesByPeriod={entriesByPeriod} currentAccountId={account.id} />
    </div>
  );
}
