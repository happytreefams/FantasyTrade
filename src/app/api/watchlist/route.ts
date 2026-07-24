import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccount } from "@/lib/current-account";
import { addToWatchlist, removeFromWatchlist } from "@/lib/watchlist";

const bodySchema = z.object({ securityId: z.string().min(1) });

export async function POST(request: Request) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A securityId is required." }, { status: 400 });
  }

  await addToWatchlist(account.id, parsed.data.securityId);
  return NextResponse.json({ watched: true });
}

export async function DELETE(request: Request) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A securityId is required." }, { status: 400 });
  }

  await removeFromWatchlist(account.id, parsed.data.securityId);
  return NextResponse.json({ watched: false });
}
