import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { updateAllFundamentals } from "@/lib/market-data";

export const maxDuration = 300;

/// Manually triggers the weekly fundamentals refresh on demand — the exact
/// same `updateAllFundamentals` routine `/api/cron/weekly-fundamentals` runs
/// on Vercel's schedule and `pnpm job:weekly-fundamentals` runs locally,
/// exposed here (session-authenticated — see the daily-close admin route's
/// doc comment for why) so an admin can populate/refresh market cap,
/// valuation ratios, and analyst ratings right after a deploy without
/// waiting for the weekly schedule.
export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const summary = await updateAllFundamentals();
  return NextResponse.json({ summary });
}
