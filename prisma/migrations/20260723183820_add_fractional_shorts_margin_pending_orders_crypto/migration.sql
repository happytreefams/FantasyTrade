-- CreateEnum
CREATE TYPE "PendingOrderType" AS ENUM ('LIMIT', 'STOP_LOSS', 'STOP_LIMIT');

-- CreateEnum
CREATE TYPE "PendingOrderStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PositionDirection" AS ENUM ('LONG', 'SHORT');

-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'CRYPTO';

-- AlterEnum
ALTER TYPE "CourseCategory" ADD VALUE 'ADVANCED_TRADING';

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('FILLED', 'REJECTED');
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderType" ADD VALUE 'STOP_LOSS';
ALTER TYPE "OrderType" ADD VALUE 'STOP_LIMIT';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "triggerPrice" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "dripEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PositionLot" ADD COLUMN     "direction" "PositionDirection" NOT NULL DEFAULT 'LONG';

-- AlterTable
ALTER TABLE "RealizedGain" ADD COLUMN     "direction" "PositionDirection" NOT NULL DEFAULT 'LONG';

-- AlterTable
ALTER TABLE "trading_accounts" ADD COLUMN     "marginCallActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marginEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marginRiskAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "marginUsed" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PendingOrder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "orderType" "PendingOrderType" NOT NULL,
    "triggerPrice" DECIMAL(14,4) NOT NULL,
    "limitPrice" DECIMAL(14,4),
    "quantity" DECIMAL(20,6) NOT NULL,
    "status" "PendingOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PendingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DividendPayment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "sharesHeld" DECIMAL(20,6) NOT NULL,
    "amountPerShare" DECIMAL(14,6) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DividendPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingOrder_status_securityId_idx" ON "PendingOrder"("status", "securityId");

-- CreateIndex
CREATE INDEX "DividendPayment_accountId_securityId_paidAt_idx" ON "DividendPayment"("accountId", "securityId", "paidAt");

-- AddForeignKey
ALTER TABLE "PendingOrder" ADD CONSTRAINT "PendingOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingOrder" ADD CONSTRAINT "PendingOrder_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendPayment" ADD CONSTRAINT "DividendPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendPayment" ADD CONSTRAINT "DividendPayment_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security"("id") ON DELETE CASCADE ON UPDATE CASCADE;

