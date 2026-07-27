import { Prisma, type AssetType, type JobRun, type PrismaClient, type Role, type Security, type User } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getLatestPrice } from "@/lib/market-data";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

export class AdminAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAccessError";
  }
}

/// Server-only helper for admin API routes and Server Components: resolves
/// the signed-in user and confirms admin status against the database (not
/// just the session's cached claim, which only refreshes at sign-in) —
/// mirrors the re-verification `requireAccount` already does for accounts.
/// Throws if there's no session or the user isn't an admin; middleware
/// already redirects non-admins away from /admin, so this is defense in
/// depth for the API routes underneath it.
export async function requireAdmin(client: Client = defaultPrisma): Promise<{ user: User }> {
  const session = await auth();
  if (!session?.user) {
    throw new AdminAccessError("Not authenticated.");
  }

  const user = await client.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") {
    throw new AdminAccessError("Not authorized.");
  }

  return { user };
}

export type AdminUserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  cashBalance: Prisma.Decimal | null;
};

/// All users for the admin dashboard's user list, newest first.
export async function listUsers(limit = 200, client: Client = defaultPrisma): Promise<AdminUserSummary[]> {
  const users = await client.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { account: { select: { cashBalance: true } } },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    cashBalance: user.account?.cashBalance ?? null,
  }));
}

export type AdminSecuritySummary = Security & {
  lastClose: Prisma.Decimal | null;
  lastCloseDate: Date | null;
};

/// All securities for the admin dashboard's security list, with the latest
/// recorded close alongside each (so a stale/missing price is visible at a
/// glance).
export async function listSecurities(limit = 500, client: Client = defaultPrisma): Promise<AdminSecuritySummary[]> {
  const securities = await client.security.findMany({ orderBy: { symbol: "asc" }, take: limit });

  return Promise.all(
    securities.map(async (security) => {
      const latest = await getLatestPrice(security.id, client);
      return { ...security, lastClose: latest?.closePrice ?? null, lastCloseDate: latest?.date ?? null };
    }),
  );
}

export type CreateSecurityInput = {
  symbol: string;
  name: string;
  assetType: AssetType;
  exchange: string;
};

/// Adds a new tradable security. Does not seed a price — the next daily-close
/// run will give it a synthetic starting price if no real quote is available.
export async function createSecurity(input: CreateSecurityInput, client: Client = defaultPrisma): Promise<Security> {
  return client.security.create({
    data: {
      symbol: input.symbol.trim().toUpperCase(),
      name: input.name.trim(),
      assetType: input.assetType,
      exchange: input.exchange.trim(),
    },
  });
}

// A run still un-finished this long after it started is treated as "stuck"
// rather than merely "in progress" — every job in this app finishes in
// well under a minute (see DEPLOYMENT.md), so 10 minutes is a generous
// margin before flagging it as likely never coming back.
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

export type JobRunView = JobRun & {
  durationSeconds: number | null;
  stillRunning: boolean;
  stuck: boolean;
};

/// Recent background-job invocations (price update, portfolio revaluation,
/// fundamentals, dividends — see `@/lib/job-runs`) for the admin dashboard's
/// Job History panel, most recent first. A row with `finishedAt` still null
/// is a run that never completed — a duration timeout or crash that
/// happened outside the job's own try/catch, so nothing else would show it
/// — surfaced by the panel as "still running" (or "stuck" past
/// `STUCK_THRESHOLD_MS`) rather than silently absent. The "is this stuck"
/// classification is computed here (server-side, once, at data-fetch time)
/// rather than in the page component, which would otherwise need to call
/// `Date.now()` during render.
export async function listRecentJobRuns(limit = 50, client: Client = defaultPrisma): Promise<JobRunView[]> {
  const runs = await client.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
  const now = Date.now();

  return runs.map((run) => {
    const stillRunning = !run.finishedAt;
    const stuck = stillRunning && now - run.startedAt.getTime() > STUCK_THRESHOLD_MS;
    const durationSeconds = run.finishedAt
      ? Math.max(0, Math.round((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000))
      : null;

    return { ...run, durationSeconds, stillRunning, stuck };
  });
}

export interface AdminService {
  requireAdmin: typeof requireAdmin;
  listUsers: typeof listUsers;
  listSecurities: typeof listSecurities;
  createSecurity: typeof createSecurity;
  listRecentJobRuns: typeof listRecentJobRuns;
}
