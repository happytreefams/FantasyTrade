import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { updateAllFundamentals } from "@/lib/market-data";

export const maxDuration = 300;

/// The weekly fundamentals refresh. Unlike the price job this runs
/// unbatched by default (one vercel.json entry, once a week) — its own
/// per-run budget cap (default 25, the free-tier daily limit) already keeps
/// a single run well within duration/rate limits, and a security beyond
/// that budget just keeps its existing fundamentals row until next week
/// rather than needing a synthetic fallback (see `updateAllFundamentals`'s
/// doc comment). `offset`/`limit` are still accepted for an admin to target
/// a specific slice on demand.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined;
  const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined;

  try {
    const summary = await updateAllFundamentals({ offset, limit });
    console.log(
      `[cron] weekly-fundamentals offset=${offset ?? 0} limit=${limit ?? "all"} — ` +
        `updated=${summary.updated.length} unavailable=${summary.unavailable.length} ` +
        `skippedOverBudget=${summary.skippedOverWeeklyBudget.length}`,
    );
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error(`[cron] weekly-fundamentals FAILED offset=${offset ?? 0} limit=${limit ?? "all"}:`, error);
    return NextResponse.json({ error: "weekly-fundamentals job failed" }, { status: 500 });
  }
}
