import { NextResponse } from "next/server";

import { requireAccount } from "@/lib/current-account";
import { executeSuggestedInvestment } from "@/lib/risk-profile";

export async function POST() {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeSuggestedInvestment(account.id);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to invest according to this plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
