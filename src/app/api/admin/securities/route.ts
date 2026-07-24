import { NextResponse } from "next/server";
import { z } from "zod";

import { AdminAccessError, createSecurity, requireAdmin } from "@/lib/admin";
import { backfillPriceHistory } from "@/lib/market-data";

const bodySchema = z.object({
  symbol: z.string().trim().min(1).max(10),
  name: z.string().trim().min(1),
  assetType: z.enum(["STOCK", "ETF", "BOND", "COMMODITY", "CRYPTO"]),
  exchange: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a symbol, name, asset type, and exchange." }, { status: 400 });
  }

  let security;
  try {
    security = await createSecurity(parsed.data);
  } catch {
    return NextResponse.json({ error: "A security with that symbol already exists." }, { status: 409 });
  }

  // Best-effort: a new security should start with real price history where
  // the provider has it, but a slow/failed backfill shouldn't block adding
  // the security itself — the next daily-close run still gives it a price.
  const backfill = await backfillPriceHistory(security.id).catch(() => ({ daysStored: 0 }));

  return NextResponse.json({ security, historyDaysBackfilled: backfill.daysStored }, { status: 201 });
}
