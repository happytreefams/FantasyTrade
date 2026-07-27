import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";
import { updateAllFundamentals } from "@/lib/market-data";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/// The weekly fundamentals refresh. Run manually in local dev with
/// `pnpm job:weekly-fundamentals` (see README). In production this is what
/// `/api/cron/weekly-fundamentals` invokes on Vercel's schedule — market cap,
/// P/E, dividend yield, and analyst ratings change slowly enough that a
/// daily refresh (like the price job) would waste the free-tier API budget.
/// Also triggerable on demand from /admin.
async function main() {
  const maxApiCallsPerRun = env.MARKET_DATA_MAX_WEEKLY_CALLS;

  console.log("Running weekly fundamentals refresh...");
  const summary = await updateAllFundamentals({ client: prisma, maxApiCallsPerRun });

  console.log(`  Updated: ${summary.updated.length} (${summary.updated.join(", ") || "none"})`);
  console.log(`  Unavailable: ${summary.unavailable.length} (${summary.unavailable.join(", ") || "none"})`);
  if (summary.skippedOverWeeklyBudget.length > 0) {
    console.log(
      `  Skipped (over weekly budget): ${summary.skippedOverWeeklyBudget.length} (${summary.skippedOverWeeklyBudget.join(", ")})`,
    );
  }
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
