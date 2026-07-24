import { NextResponse } from "next/server";

import { requireAccount } from "@/lib/current-account";
import { cancelPendingOrder, TradingError } from "@/lib/trading";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await cancelPendingOrder(id, account.id);
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    if (error instanceof TradingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
