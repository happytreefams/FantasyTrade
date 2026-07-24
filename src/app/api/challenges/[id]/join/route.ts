import { NextResponse } from "next/server";

import { joinChallenge } from "@/lib/challenges";
import { requireAccount } from "@/lib/current-account";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const participant = await joinChallenge(account.id, id);
    return NextResponse.json({ participant }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't join this challenge.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
