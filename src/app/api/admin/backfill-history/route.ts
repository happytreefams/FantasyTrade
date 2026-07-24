import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { backfillAllPriceHistory } from "@/lib/market-data";

/// Manually triggers a bulk price-history backfill across every security —
/// for catching up securities added before this feature existed. New
/// securities added via /admin already get backfilled automatically on
/// creation (see /api/admin/securities).
export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const summary = await backfillAllPriceHistory();
  return NextResponse.json({ summary });
}
