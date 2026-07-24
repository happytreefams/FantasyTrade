import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinChallengeButton } from "@/components/join-challenge-button";
import { getChallenge, getChallengeStandings, getVisibleChallenges } from "@/lib/challenges";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate, formatCurrency, formatPercent } from "@/lib/format";

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account } = await requireAccount();

  const challenge = await getChallenge(id);
  if (!challenge) {
    notFound();
  }

  const [standings, visibleChallenges] = await Promise.all([
    getChallengeStandings(id),
    getVisibleChallenges(account.id),
  ]);
  const status = visibleChallenges.find((c) => c.id === id);
  const hasJoined = status?.hasJoined ?? standings.some((entry) => entry.accountId === account.id);
  const isOpen = status?.isOpen ?? challenge.endDate >= new Date();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/challenges" className="text-caption text-foreground-muted hover:text-foreground">
          ← Challenges
        </Link>
        <h1 className="mt-1 text-display font-semibold tracking-tight">{challenge.name}</h1>
        <p className="mt-1 text-body text-foreground-muted">{challenge.description}</p>
        <p className="mt-1 text-caption text-foreground-subtle">
          {formatAsOfDate(challenge.startDate)} – {formatAsOfDate(challenge.endDate)}
        </p>
      </div>

      {!hasJoined && isOpen ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-body text-foreground">Join to start tracking your % change from today.</p>
          <JoinChallengeButton challengeId={challenge.id} />
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Standings</h2>
        {standings.length === 0 ? (
          <p className="text-body text-foreground-muted">Nobody has joined yet — be the first.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-background-elevated">
            {standings.map((entry, index) => {
              const isCurrentUser = entry.accountId === account.id;
              const isGain = entry.changePercent >= 0;
              return (
                <li
                  key={entry.accountId}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${isCurrentUser ? "bg-accent/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-financial text-caption text-foreground-subtle">{index + 1}</span>
                    <div>
                      <p className="text-body font-medium">
                        {entry.name ?? "—"}
                        {isCurrentUser ? <span className="ml-1.5 text-caption text-accent">(you)</span> : null}
                      </p>
                      <p className="text-caption text-foreground-subtle">
                        {formatCurrency(entry.baselineValue)} → {formatCurrency(entry.currentValue)}
                      </p>
                    </div>
                  </div>
                  <span className={`font-financial text-body ${isGain ? "text-positive" : "text-negative"}`}>
                    {formatPercent(entry.changePercent)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
