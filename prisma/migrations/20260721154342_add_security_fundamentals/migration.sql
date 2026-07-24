-- CreateTable
CREATE TABLE "SecurityFundamentals" (
    "id" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "marketCap" BIGINT,
    "week52High" DECIMAL(14,4),
    "week52Low" DECIMAL(14,4),
    "dividendYield" DECIMAL(8,4),
    "peRatio" DECIMAL(10,4),
    "analystTargetPrice" DECIMAL(14,4),
    "analystStrongBuy" INTEGER,
    "analystBuy" INTEGER,
    "analystHold" INTEGER,
    "analystSell" INTEGER,
    "analystStrongSell" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityFundamentals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityFundamentals_securityId_key" ON "SecurityFundamentals"("securityId");

-- AddForeignKey
ALTER TABLE "SecurityFundamentals" ADD CONSTRAINT "SecurityFundamentals_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security"("id") ON DELETE CASCADE ON UPDATE CASCADE;
