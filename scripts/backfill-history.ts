import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";
import { backfillPriceHistory } from "@/lib/market-data";
import { TWELVE_DATA_SINGLE_REQUEST_INTERVAL_MS } from "@/lib/market-data/providers/twelve-data";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// A security with at least this many stored days is considered "already
// backfilled" and skipped without an API call — the daily-close cron writes
// one row/day going forward, so this is only ever a large number for a
// security a prior backfill run already covered. ~1 trading year: comfortably
// more than the daily job alone would accumulate in the time it'd take
// anyone to notice a security needs backfilling and run this script.
const SUFFICIENT_HISTORY_DAYS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/// One-time historical backfill for every Security's PriceHistory, intended
/// to be run manually (`pnpm job:backfill-history`) from a local machine
/// pointed at the production DATABASE_URL — see DEPLOYMENT.md — right after
/// the S&P 500 seed, since a fresh seed gives every new constituent only a
/// single placeholder close (see prisma/seed.ts) until either this script or
/// enough days of the daily cron fill in real history.
///
/// Deliberately NOT a Vercel cron/serverless route: at Twelve Data's 8/min
/// free-tier pace, backfilling ~500 symbols takes roughly an hour — well
/// beyond even Fluid Compute's 300s ceiling. Running it as a long-lived local
/// process has no such limit.
///
/// Resumable: securities that already have >= SUFFICIENT_HISTORY_DAYS rows
/// are skipped without an API call, so stopping (Ctrl+C) and re-running
/// picks up roughly where it left off instead of re-fetching everything.
async function main() {
  if (!env.TWELVE_DATA_API_KEY) {
    console.error("TWELVE_DATA_API_KEY is not set — nothing to backfill. See .env.production.example.");
    process.exitCode = 1;
    return;
  }

  const securities = await prisma.security.findMany({ orderBy: { symbol: "asc" } });
  console.log(`Backfilling price history for ${securities.length} securities...`);

  let fetched = 0;
  let skippedAlready = 0;
  let unavailable = 0;
  let failed = 0;

  for (let index = 0; index < securities.length; index += 1) {
    const security = securities[index];
    const progress = `(${index + 1} of ${securities.length})`;

    const existingDays = await prisma.priceHistory.count({ where: { securityId: security.id } });
    if (existingDays >= SUFFICIENT_HISTORY_DAYS) {
      console.log(`${progress} ${security.symbol} — already has ${existingDays} days, skipping.`);
      skippedAlready += 1;
      continue;
    }

    try {
      const { daysStored } = await backfillPriceHistory(security.id, prisma);
      if (daysStored > 0) {
        console.log(`${progress} ${security.symbol} — stored ${daysStored} new day(s) of history.`);
        fetched += 1;
      } else {
        console.log(`${progress} ${security.symbol} — no history available from Twelve Data.`);
        unavailable += 1;
      }
    } catch (error) {
      console.error(`${progress} ${security.symbol} — FAILED:`, error);
      failed += 1;
    }

    const isLastSecurity = index === securities.length - 1;
    if (!isLastSecurity) {
      await sleep(TWELVE_DATA_SINGLE_REQUEST_INTERVAL_MS);
    }
  }

  console.log("Done.");
  console.log(
    `  Backfilled: ${fetched}, already had sufficient history: ${skippedAlready}, ` +
      `unavailable: ${unavailable}, failed: ${failed}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
