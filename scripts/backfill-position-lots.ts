import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/// One-time backfill for the per-lot cost-basis migration (see ARCHITECTURE.md):
/// any Position created before PositionLot existed has no corresponding open
/// lot, which would make it unsellable (applySell finds zero open lots to
/// consume) and invisible on the Tax Lots page. Creates one synthetic lot
/// per position lacking full lot coverage, sized to the shortfall and priced
/// at the position's existing average cost basis. The original purchase
/// date(s) aren't recoverable from the pre-migration schema, so the
/// synthetic lot is dated now — its holding period starts fresh rather than
/// inheriting whatever the real original purchase date was. Idempotent: run
/// again any time and it only tops up positions still short of lot coverage.
async function main() {
  const positions = await prisma.position.findMany();
  let created = 0;

  for (const position of positions) {
    const existingLots = await prisma.positionLot.findMany({
      where: { accountId: position.accountId, securityId: position.securityId },
    });
    const openQuantity = existingLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));

    if (openQuantity.lessThan(position.quantity)) {
      const shortfall = position.quantity.minus(openQuantity);
      await prisma.positionLot.create({
        data: {
          accountId: position.accountId,
          securityId: position.securityId,
          quantity: shortfall,
          originalQuantity: shortfall,
          costBasis: position.avgCostBasis,
          purchaseDate: new Date(),
        },
      });
      created += 1;
      console.log(`  Backfilled ${shortfall.toString()} shares for account ${position.accountId}, security ${position.securityId}.`);
    }
  }

  console.log(`Backfilled ${created} synthetic lot(s) for pre-existing positions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
