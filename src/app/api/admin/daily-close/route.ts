import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { runDailyClose } from "@/lib/daily-close";

// A full, unbatched run (all securities) can take longer than the default
// 60s if many are within the real-fetch budget — same reasoning as
// `/api/cron/daily-prices`'s `maxDuration`.
export const maxDuration = 300;

/// Manually triggers the overnight valuation job on demand — the exact same
/// `runDailyClose` routine `/api/cron/daily-prices` runs on Vercel's
/// schedule and `pnpm job:daily-close` runs locally, exposed here (session-
/// authenticated, not CRON_SECRET-authenticated — see DEPLOYMENT.md for why
/// the admin dashboard uses the session/role gate instead of shipping the
/// cron secret to the browser) so an admin can verify or catch up pricing
/// right after a deploy without shell access to the server. Unlike the cron
/// route this always runs the full, unbatched universe (no offset/limit) —
/// fine for an occasional manual check, not something hit on every request.
export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const summary = await runDailyClose();
  return NextResponse.json({ summary });
}
