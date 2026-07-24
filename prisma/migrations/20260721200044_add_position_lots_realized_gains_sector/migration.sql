-- CreateEnum
CREATE TYPE "TaxTerm" AS ENUM ('SHORT_TERM', 'LONG_TERM');

-- AlterTable
ALTER TABLE "SecurityFundamentals" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "sector" TEXT;

-- CreateTable
CREATE TABLE "PositionLot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "originalQuantity" DECIMAL(20,6) NOT NULL,
    "costBasis" DECIMAL(14,4) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealizedGain" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "costBasis" DECIMAL(14,4) NOT NULL,
    "proceeds" DECIMAL(14,4) NOT NULL,
    "gainLoss" DECIMAL(14,4) NOT NULL,
    "holdingPeriodDays" INTEGER NOT NULL,
    "term" "TaxTerm" NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealizedGain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PositionLot_accountId_securityId_purchaseDate_idx" ON "PositionLot"("accountId", "securityId", "purchaseDate");

-- CreateIndex
CREATE INDEX "RealizedGain_accountId_closedAt_idx" ON "RealizedGain"("accountId", "closedAt");

-- AddForeignKey
ALTER TABLE "PositionLot" ADD CONSTRAINT "PositionLot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionLot" ADD CONSTRAINT "PositionLot_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizedGain" ADD CONSTRAINT "RealizedGain_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizedGain" ADD CONSTRAINT "RealizedGain_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security"("id") ON DELETE CASCADE ON UPDATE CASCADE;
