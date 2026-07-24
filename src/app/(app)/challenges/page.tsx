import Link from "next/link";

import { JoinChallengeButton } from "@/components/join-challenge-button";
import { getVisibleChallenges } from "@/lib/challenges";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate } from "@/lib/format";

export default async function ChallengesPage() {
  const { account } = await requireAccount();
  const challenges = await getVisibleChallenges(account.id);

  const open = challenges.filter((challenge) => challenge.isOpen);
  const past = challenges.filter((challenge) => !challenge.isOpen);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Trading Challenges</h1>
        <p className="mt-1 text-body text-foreground-muted">
          Join a challenge to compete on % return from the moment you join — using your normal trading account, not a
          separate portfolio, so your regular trading also counts toward your standing.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Open challenges</h2>
        {open.length === 0 ? (
          <p className="text-body text-foreground-muted">No open challenges right now — check back later.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background-elevated">
            {open.map((challenge) => (
              <li key={challenge.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/challenges/${challenge.id}`} className="text-body font-medium text-foreground hover:text-accent hover:underline">
                    {challenge.name}
                  </Link>
                  <p className="text-caption text-foreground-muted">{challenge.description}</p>
                  <p className="mt-1 text-caption text-foreground-subtle">
                    {formatAsOfDate(challenge.startDate)} – {formatAsOfDate(challenge.endDate)} · {challenge.participantCount}{" "}
                    participant{challenge.participantCount === 1 ? "" : "s"}
                  </p>
                </div>
                {challenge.hasJoined ? (
                  <Link href={`/challenges/${challenge.id}`} className="shrink-0 text-caption text-accent hover:underline">
                    View standings →
                  </Link>
                ) : (
                  <JoinChallengeButton challengeId={challenge.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-semibold">Past challenges</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background-elevated">
            {past.map((challenge) => (
              <li key={challenge.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-body font-medium text-foreground">{challenge.name}</p>
                  <p className="text-caption text-foreground-subtle">
                    {formatAsOfDate(challenge.startDate)} – {formatAsOfDate(challenge.endDate)}
                  </p>
                </div>
                <Link href={`/challenges/${challenge.id}`} className="shrink-0 text-caption text-accent hover:underline">
                  View results →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
