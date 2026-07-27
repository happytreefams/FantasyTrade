import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { postQuarterlyDividends } from "@/lib/dividends";
import { previousTradingDay } from "@/lib/market-data";

/// Manually triggers the quarterly dividend check on demand — the exact
/// same `postQuarterlyDividends` routine `/api/cron/quarterly-dividends`
/// runs on Vercel's schedule, exposed here (session-authenticated) so an
/// admin can verify dividend posting without waiting for the schedule or
/// digging through logs. Idempotent — see that route's doc comment.
export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const targetDate = previousTradingDay();
  const summary = await postQuarterlyDividends(targetDate);
  return NextResponse.json({ summary });
}
