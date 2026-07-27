import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runDailyClose } from "@/lib/daily-close";

// Declared for headroom, but deliberately NOT relied on for correctness —
// see the post-incident note below. Each shard is sized (limit=8, one
// single Twelve Data batch call, no inter-chunk sleep) to finish well
// within the *default* 60s every Vercel plan guarantees, whether or not
// Fluid Compute is actually active on this project.
export const maxDuration = 300;

/// The daily price job, batched across 65 staggered vercel.json cron
/// entries (8 symbols each) so the full ~520-security S&P 500 universe gets
/// touched once a day without any single invocation exceeding Twelve Data's
/// 8/minute pacing limit or the function's duration limit. `offset`/`limit`
/// select which slice of the (alphabetically ordered, so stable) security
/// list this invocation is responsible for; `maxApiCallsPerRun` is still the
/// GLOBAL daily budget (800/day) shared across every batch — see
/// `updateAllClosingPrices`'s doc comment. Also runs the full
/// pending-order/dividend/margin/snapshot side effects every time (cheap,
/// DB-only, idempotent) — see `runDailyClose`'s doc comment for why that's
/// safe to repeat per batch rather than needing its own separate schedule.
///
/// POST-INCIDENT NOTE (see DEPLOYMENT.md "Diagnosed incident" section):
/// an earlier version of this schedule used limit=40 (5 Twelve Data batch
/// calls, ~4-5 min worst case), sized on the assumption that Fluid
/// Compute's extended 300s duration was active in production. That was
/// never actually confirmed against the deployed project's real settings.
/// If Fluid wasn't active, Vercel's default 60s ceiling would silently
/// kill the function mid-run — during the first inter-chunk sleep, before
/// `runDailyClose` ever reached pending-order evaluation, dividend
/// posting, margin maintenance, or the account value snapshot loop below.
/// A platform timeout kill happens outside this route's own try/catch, so
/// nothing would be logged and no error would surface — exactly a "prices
/// and portfolio values silently stop updating" symptom with no
/// corresponding failure in the app's own logs. Shrinking to limit=8
/// removes the dependency on Fluid Compute entirely: one HTTP call, no
/// sleep, done in a few seconds regardless of plan settings.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined;
  const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined;

  try {
    const summary = await runDailyClose({ offset, limit });
    console.log(
      `[cron] daily-prices offset=${offset ?? 0} limit=${limit ?? "all"} — ` +
        `fetched=${summary.priceUpdate.fetchedFromApi.length} ` +
        `synthetic=${summary.priceUpdate.synthetic.length} ` +
        `skippedOverBudget=${summary.priceUpdate.skippedOverDailyBudget.length} ` +
        `pendingFilled=${summary.pendingOrders.filled.length} ` +
        `dividendsPaid=${summary.dividends.paid.length} ` +
        `marginFlagged=${summary.marginMaintenance.flagged.length} ` +
        `accountsSnapshotted=${summary.accountsSnapshotted}`,
    );
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error(`[cron] daily-prices FAILED offset=${offset ?? 0} limit=${limit ?? "all"}:`, error);
    return NextResponse.json({ error: "daily-prices job failed" }, { status: 500 });
  }
}
