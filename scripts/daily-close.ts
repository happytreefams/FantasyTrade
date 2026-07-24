import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { runDailyClose } from "@/lib/daily-close";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/// The overnight valuation job. Run manually in local dev with
/// `pnpm job:daily-close` (see README). In a real deployment this is what a
/// nightly cron / scheduled task would invoke after market close. Also
/// triggerable on demand from /admin — see `@/lib/daily-close`.
async function main() {
  const maxApiCallsPerRun = process.env.MARKET_DATA_MAX_DAILY_CALLS
    ? Number(process.env.MARKET_DATA_MAX_DAILY_CALLS)
    : undefined;

  console.log("Running daily close...");
  const { priceUpdate, pendingOrders, dividends, marginMaintenance, accountsSnapshotted } = await runDailyClose({
    client: prisma,
    maxApiCallsPerRun,
  });

  console.log(`  Target date: ${priceUpdate.targetDate.toISOString().slice(0, 10)}`);
  console.log(`  Fetched from API: ${priceUpdate.fetchedFromApi.length} (${priceUpdate.fetchedFromApi.join(", ") || "none"})`);
  console.log(`  Synthetic fallback: ${priceUpdate.synthetic.length} (${priceUpdate.synthetic.join(", ") || "none"})`);
  if (priceUpdate.skippedOverDailyBudget.length > 0) {
    console.log(
      `  Skipped API call (over daily budget, synthetic used instead): ${priceUpdate.skippedOverDailyBudget.length} (${priceUpdate.skippedOverDailyBudget.join(", ")})`,
    );
  }

  console.log(`  Pending orders — filled: ${pendingOrders.filled.length}, expired: ${pendingOrders.expired.length}`);
  console.log(`  Dividends posted: ${dividends.paid.length} (${dividends.paid.filter((p) => p.reinvested).length} reinvested via DRIP)`);
  console.log(`  Margin calls — flagged: ${marginMaintenance.flagged.length}, cleared: ${marginMaintenance.cleared.length}`);
  console.log(`  Snapshotted ${accountsSnapshotted} account(s) for ${priceUpdate.targetDate.toISOString().slice(0, 10)}.`);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
