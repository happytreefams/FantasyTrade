import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { postQuarterlyDividends } from "@/lib/dividends";
import { previousTradingDay } from "@/lib/market-data";

/// A standalone, independently-schedulable dividend check. `/api/cron/daily-prices`
/// already calls `postQuarterlyDividends` as part of its full daily-close
/// orchestration (dividends need that day's fresh prices anyway), so this
/// route is a safety net, not the only path to a dividend getting posted —
/// harmless to run again in the same quarter, since posting is idempotent
/// (`postQuarterlyDividends` skips any (account, security) already paid this
/// calendar quarter). Kept as its own route/schedule per the "quarterly
/// dividend job" naming this deployment's cron setup uses — see
/// DEPLOYMENT.md. No external API calls here, so no rate-limit/batching
/// concerns and no need for an extended duration.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const targetDate = previousTradingDay();
    const summary = await postQuarterlyDividends(targetDate);
    console.log(
      `[cron] quarterly-dividends targetDate=${targetDate.toISOString().slice(0, 10)} — paid=${summary.paid.length}`,
    );
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron] quarterly-dividends FAILED:", error);
    return NextResponse.json({ error: "quarterly-dividends job failed" }, { status: 500 });
  }
}
