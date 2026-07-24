import { Prisma, type Group, type PrismaClient } from "@prisma/client";

import { getLearningStats } from "@/lib/learning";
import { getPortfolioSummary } from "@/lib/portfolio";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

export class GroupAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroupAccessError";
  }
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud/type
const JOIN_CODE_LENGTH = 6;

function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

export type CreateGroupInput = {
  name: string;
  startingCash: number;
};

/// Creates a classroom Group taught by `userId`, generating a unique
/// joinCode (retrying on the rare collision). Promotes the creator to
/// TEACHER if they're currently a STUDENT — this is how a user becomes a
/// teacher in this app (self-serve, no admin approval); an existing ADMIN
/// is never downgraded.
export async function createGroup(userId: string, input: CreateGroupInput, client: Client = defaultPrisma): Promise<Group> {
  const name = input.name.trim();
  if (!name) throw new Error("A classroom name is required.");
  if (!Number.isFinite(input.startingCash) || input.startingCash <= 0) {
    throw new Error("Starting cash must be a positive number.");
  }

  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });

  let group: Group | null = null;
  for (let attempt = 0; attempt < 5 && !group; attempt += 1) {
    try {
      group = await client.group.create({
        data: {
          name,
          teacherId: userId,
          joinCode: generateJoinCode(),
          startingCash: new Prisma.Decimal(input.startingCash),
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  if (!group) throw new Error("Couldn't generate a unique join code — please try again.");

  if (user.role === "STUDENT") {
    await client.user.update({ where: { id: userId }, data: { role: "TEACHER" } });
  }

  return group;
}

export async function getGroupsForTeacher(userId: string, client: Client = defaultPrisma): Promise<Group[]> {
  return client.group.findMany({ where: { teacherId: userId }, orderBy: { createdAt: "desc" } });
}

export async function getGroup(groupId: string, client: Client = defaultPrisma): Promise<Group | null> {
  return client.group.findUnique({ where: { id: groupId } });
}

/// Server-only helper mirroring `requireAdmin`: resolves the signed-in user
/// and confirms they teach `groupId` specifically (or are an ADMIN) — a
/// TEACHER of one classroom must not be able to view another's roster just
/// by guessing/incrementing a groupId in the URL. Throws if there's no
/// session, the group doesn't exist, or the caller doesn't teach it.
export async function requireGroupTeacher(groupId: string, client: Client = defaultPrisma): Promise<{ group: Group }> {
  // Imported lazily (not at module top-level) so that other exports from
  // this file — `joinGroup`, `createGroup`, etc., which don't need a session
  // — can be imported (e.g. from the signup API route) without pulling
  // NextAuth into the module graph at all; NextAuth touches `next/server`
  // internals that aren't resolvable in the Vitest test environment.
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user) {
    throw new GroupAccessError("Not authenticated.");
  }

  const group = await client.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupAccessError("Classroom not found.");
  }

  if (group.teacherId !== session.user.id && session.user.role !== "ADMIN") {
    throw new GroupAccessError("Not authorized.");
  }

  return { group };
}

/// Links `userId`'s Account into the classroom identified by `joinCode`.
/// If the account hasn't traded yet (no orders on record) AND is still at
/// the platform's default starting balance, its cashBalance is reset to the
/// group's `startingCash` — a student who joins fresh (the common case, at
/// signup) starts the class with exactly the balance the teacher set. A
/// student who already has trading history keeps their existing balance
/// unchanged (only `groupId` is set) rather than silently wiping it out;
/// this is a known simplification — see ARCHITECTURE.md.
const PLATFORM_DEFAULT_STARTING_CASH = new Prisma.Decimal("1000000.00");

export async function joinGroup(userId: string, joinCode: string, client: Client = defaultPrisma): Promise<Group> {
  const group = await client.group.findUnique({ where: { joinCode: joinCode.trim().toUpperCase() } });
  if (!group) throw new Error("Invalid join code.");

  const account = await client.account.findUniqueOrThrow({ where: { userId } });
  const orderCount = await client.order.count({ where: { accountId: account.id } });
  const isFreshAccount = orderCount === 0 && account.cashBalance.equals(PLATFORM_DEFAULT_STARTING_CASH);

  await client.account.update({
    where: { id: account.id },
    data: {
      groupId: group.id,
      ...(isFreshAccount ? { cashBalance: group.startingCash } : {}),
    },
  });

  return group;
}

export type GroupRosterEntry = {
  userId: string;
  accountId: string;
  name: string | null;
  email: string;
  portfolioValue: number;
  returnPercent: number;
  completedLessons: number;
  totalLessons: number;
};

/// The teacher dashboard's roster: every student account linked to this
/// group, with current portfolio value, % return since the group's
/// `startingCash` baseline (see `joinGroup`'s doc comment for why that's
/// the right baseline here, and its one known edge case), and learning
/// progress. Unlike the public leaderboard, real name/email are shown here
/// deliberately — a teacher already knows their own students; there's no
/// privacy boundary to preserve within a private classroom roster.
export async function getGroupRoster(groupId: string, client: PrismaClient = defaultPrisma): Promise<GroupRosterEntry[]> {
  const accounts = await client.account.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const group = await client.group.findUniqueOrThrow({ where: { id: groupId } });

  return Promise.all(
    accounts.map(async (account) => {
      const [summary, learningStats] = await Promise.all([
        getPortfolioSummary(account.id, client),
        getLearningStats(account.user.id, client),
      ]);

      const portfolioValue = Number(summary.totalPortfolioValue);
      const baseline = Number(group.startingCash);
      const returnPercent = baseline === 0 ? 0 : ((portfolioValue - baseline) / baseline) * 100;

      return {
        userId: account.user.id,
        accountId: account.id,
        name: account.user.name,
        email: account.user.email,
        portfolioValue,
        returnPercent,
        completedLessons: learningStats.completedLessons,
        totalLessons: learningStats.totalLessons,
      };
    }),
  );
}
