import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/// Server-only helper for API routes and Server Components: resolves the
/// signed-in user's brokerage Account. Throws if there's no session — callers
/// running behind the (app) layout or middleware are already guaranteed one.
export async function requireAccount() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const account = await prisma.account.findUniqueOrThrow({ where: { userId: session.user.id } });

  return { session, account };
}
