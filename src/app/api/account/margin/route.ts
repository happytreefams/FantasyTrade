import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccount } from "@/lib/current-account";
import { hasCompletedAdvancedTradingEducation } from "@/lib/learning";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  enabled: z.boolean(),
  acknowledged: z.boolean().optional(),
});

/// Enables or disables short selling & margin for the current account.
/// Disabling never needs a gate. Enabling requires both Advanced Trading
/// lessons/quizzes completed *and* the one-time risk acknowledgment — both
/// re-checked here server-side, since the Settings toggle being disabled is
/// only a UI courtesy, not the actual enforcement (the real enforcement is
/// `@/lib/trading`'s `applySell` refusing to open a short at all unless
/// `marginEnabled` is already true in the database).
export async function POST(request: Request) {
  const { account, session } = await requireAccount().catch(() => ({ account: null, session: null }));
  if (!account || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!parsed.data.enabled) {
    await prisma.account.update({ where: { id: account.id }, data: { marginEnabled: false } });
    return NextResponse.json({ marginEnabled: false });
  }

  const completedEducation = await hasCompletedAdvancedTradingEducation(session.user.id);
  if (!completedEducation) {
    return NextResponse.json(
      { error: "Complete both Advanced Trading lessons and their quizzes before enabling short selling & margin." },
      { status: 400 },
    );
  }

  if (!parsed.data.acknowledged) {
    return NextResponse.json(
      { error: "You must acknowledge the risk of short selling and margin trading before enabling it." },
      { status: 400 },
    );
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { marginEnabled: true, marginRiskAcknowledgedAt: new Date() },
  });

  return NextResponse.json({ marginEnabled: true });
}
