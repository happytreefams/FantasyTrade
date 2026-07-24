import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccount } from "@/lib/current-account";
import { getSuggestedTrades, RISK_QUESTIONS, saveRiskProfile } from "@/lib/risk-profile";

const bodySchema = z.object({ answers: z.record(z.string(), z.number().int().min(0)) });

export async function POST(request: Request) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "An answers object is required." }, { status: 400 });
  }

  const missing = RISK_QUESTIONS.some((question) => parsed.data.answers[question.id] === undefined);
  if (missing) {
    return NextResponse.json({ error: "Please answer every question before submitting." }, { status: 400 });
  }

  const riskProfile = await saveRiskProfile(account.id, parsed.data.answers);
  const suggestedTrades = await getSuggestedTrades(account.id, riskProfile.category);

  return NextResponse.json({ riskProfile, suggestedTrades });
}
