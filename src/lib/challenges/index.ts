import { Prisma, type Challenge, type PrismaClient } from "@prisma/client";

import { getPortfolioSummary } from "@/lib/portfolio";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

export type CreateChallengeInput = {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  groupId?: string | null;
};

export async function createChallenge(input: CreateChallengeInput, client: Client = defaultPrisma): Promise<Challenge> {
  const name = input.name.trim();
  if (!name) throw new Error("A challenge name is required.");
  if (input.endDate <= input.startDate) throw new Error("End date must be after the start date.");

  return client.challenge.create({
    data: {
      name,
      description: input.description.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      groupId: input.groupId ?? null,
    },
  });
}

export type ChallengeWithStatus = Challenge & {
  participantCount: number;
  hasJoined: boolean;
  isOpen: boolean;
};

/// Every challenge visible to `accountId` — global (groupId null) plus any
/// scoped to the account's own classroom, if it belongs to one — annotated
/// with whether the challenge window has ended and whether this account has
/// already joined. Ordered soonest-ending first among open challenges.
export async function getVisibleChallenges(
  accountId: string,
  client: PrismaClient = defaultPrisma,
): Promise<ChallengeWithStatus[]> {
  const account = await client.account.findUniqueOrThrow({ where: { id: accountId }, select: { groupId: true } });

  const challenges = await client.challenge.findMany({
    where: account.groupId ? { OR: [{ groupId: null }, { groupId: account.groupId }] } : { groupId: null },
    include: { participants: { select: { accountId: true } } },
    orderBy: { endDate: "asc" },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return challenges.map((challenge) => ({
    ...challenge,
    participantCount: challenge.participants.length,
    hasJoined: challenge.participants.some((p) => p.accountId === accountId),
    isOpen: challenge.endDate >= today,
  }));
}

export async function getChallenge(challengeId: string, client: Client = defaultPrisma): Promise<Challenge | null> {
  return client.challenge.findUnique({ where: { id: challengeId } });
}

/// Joining snapshots the account's CURRENT total portfolio value as
/// `baselineValue` — see the `ChallengeParticipant` schema doc comment for
/// why this is a same-account baseline snapshot rather than an isolated
/// sub-portfolio, and its known limitation. Re-joining an already-joined
/// challenge is a no-op (returns the existing row) rather than resetting the
/// baseline, since that would let a participant "re-baseline" mid-challenge
/// to erase a loss.
export async function joinChallenge(accountId: string, challengeId: string, client: Client = defaultPrisma) {
  const existing = await client.challengeParticipant.findUnique({
    where: { challengeId_accountId: { challengeId, accountId } },
  });
  if (existing) return existing;

  const summary = await getPortfolioSummary(accountId, client as PrismaClient);

  return client.challengeParticipant.create({
    data: { challengeId, accountId, baselineValue: summary.totalPortfolioValue },
  });
}

export type ChallengeStandingEntry = {
  accountId: string;
  userId: string;
  name: string | null;
  baselineValue: number;
  currentValue: number;
  changePercent: number;
};

/// Ranks every participant in `challengeId` by % change from their own
/// `baselineValue` to their current total portfolio value. Standings are
/// visible to any participant (not privacy-gated like the public
/// leaderboard) since joining a challenge is itself an opt-in, contextual
/// action — same spirit as a classroom roster, scoped to people who chose
/// to compete in this specific challenge.
export async function getChallengeStandings(
  challengeId: string,
  client: PrismaClient = defaultPrisma,
): Promise<ChallengeStandingEntry[]> {
  const participants = await client.challengeParticipant.findMany({
    where: { challengeId },
    include: { account: { include: { user: { select: { id: true, name: true, displayName: true } } } } },
  });

  const standings = await Promise.all(
    participants.map(async (participant): Promise<ChallengeStandingEntry> => {
      const summary = await getPortfolioSummary(participant.accountId, client);
      const baselineValue = Number(participant.baselineValue);
      const currentValue = Number(summary.totalPortfolioValue);
      const changePercent = baselineValue === 0 ? 0 : ((currentValue - baselineValue) / baselineValue) * 100;

      return {
        accountId: participant.accountId,
        userId: participant.account.user.id,
        name: participant.account.user.displayName || participant.account.user.name,
        baselineValue,
        currentValue,
        changePercent,
      };
    }),
  );

  return standings.sort((a, b) => b.changePercent - a.changePercent);
}
