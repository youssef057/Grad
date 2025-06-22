-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DELIVERY_FEE_OWED', 'PRODUCT_PAYMENT_OWED', 'REFUND', 'ADJUSTMENT', 'COMMISSION', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "orderId" TEXT,
    "merchantId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "settlementId" TEXT,
    "settledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_balances" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "totalOwedToMerchant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOwedByMerchant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "settlementType" TEXT NOT NULL DEFAULT 'MANUAL_SETTLEMENT',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "notesAr" TEXT,
    "settledBy" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_transactionNumber_key" ON "financial_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "financial_transactions_transactionNumber_idx" ON "financial_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "financial_transactions_merchantId_idx" ON "financial_transactions"("merchantId");

-- CreateIndex
CREATE INDEX "financial_transactions_orderId_idx" ON "financial_transactions"("orderId");

-- CreateIndex
CREATE INDEX "financial_transactions_status_idx" ON "financial_transactions"("status");

-- CreateIndex
CREATE INDEX "financial_transactions_createdAt_idx" ON "financial_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_balances_merchantId_key" ON "merchant_balances"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_balances_merchantId_idx" ON "merchant_balances"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlementNumber_key" ON "settlements"("settlementNumber");

-- CreateIndex
CREATE INDEX "settlements_settlementNumber_idx" ON "settlements"("settlementNumber");

-- CreateIndex
CREATE INDEX "settlements_merchantId_idx" ON "settlements"("merchantId");

-- CreateIndex
CREATE INDEX "settlements_settledBy_idx" ON "settlements"("settledBy");

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_balances" ADD CONSTRAINT "merchant_balances_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
