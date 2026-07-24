import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccount } from "@/lib/current-account";
import { updateLeaderboardSettings } from "@/lib/leaderboard";

const bodySchema = z.object({
  isPublicOnLeaderboard: z.boolean(),
  displayName: z.string().trim().max(40).nullable(),
});

export async function POST(request: Request) {
  const { session, account } = await requireAccount().catch(() => ({ session: null, account: null }));
  if (!session || !account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await updateLeaderboardSettings(account.id, session.user.id, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't update leaderboard settings.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
