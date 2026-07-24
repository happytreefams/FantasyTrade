"use client";

import { useState } from "react";

import { formatPercent } from "@/lib/format";
import { LEADERBOARD_PERIOD_LABELS, type LeaderboardEntry, type LeaderboardPeriod } from "@/lib/leaderboard/types";

const PERIODS: LeaderboardPeriod[] = ["WEEKLY", "MONTHLY", "ALL_TIME"];

export function LeaderboardTable({
  entriesByPeriod,
  currentAccountId,
}: {
  entriesByPeriod: Record<LeaderboardPeriod, LeaderboardEntry[]>;
  currentAccountId: string;
}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("WEEKLY");
  const entries = entriesByPeriod[period];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 self-start rounded-md border border-border p-1" role="group" aria-label="Leaderboard period">
        {PERIODS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPeriod(option)}
            aria-pressed={period === option}
            className={`rounded px-3 py-1.5 text-caption font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              period === option ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {LEADERBOARD_PERIOD_LABELS[option]}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="text-body text-foreground-muted">
          No opted-in traders have enough history yet for this period — check back after a few daily closes.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-background-elevated">
          {entries.map((entry, index) => {
            const isCurrentUser = entry.accountId === currentAccountId;
            const isGain = entry.returnPercent >= 0;
            return (
              <li
                key={entry.accountId}
                className={`flex items-center justify-between gap-4 px-4 py-3 ${isCurrentUser ? "bg-accent/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-financial text-caption text-foreground-subtle">{index + 1}</span>
                  <span className="text-body font-medium">
                    {entry.displayName}
                    {isCurrentUser ? <span className="ml-1.5 text-caption text-accent">(you)</span> : null}
                  </span>
                </div>
                <span className={`font-financial text-body ${isGain ? "text-positive" : "text-negative"}`}>
                  {formatPercent(entry.returnPercent)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
