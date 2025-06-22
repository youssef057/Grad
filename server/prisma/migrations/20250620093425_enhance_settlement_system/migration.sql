/*
  Warnings:

  - You are about to drop the column `merchantId` on the `settlements` table. All the data in the column will be lost.
  - You are about to drop the column `settlementType` on the `settlements` table. All the data in the column will be lost.
  - Added the required column `settlementName` to the `settlements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `settlements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userType` to the `settlements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_DELIVERED';

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_settledBy_fkey";

-- DropIndex
DROP INDEX "settlements_merchantId_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addedToDriverSettlement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "addedToMerchantSettlement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "addedToOutsourceSettlement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalProductPrice" DOUBLE PRECISION,
ADD COLUMN     "outsourceId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deliveryCommission" INTEGER;

-- AlterTable
ALTER TABLE "settlements" DROP COLUMN "merchantId",
DROP COLUMN "settlementType",
ADD COLUMN     "settlementName" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "userType" TEXT NOT NULL,
ALTER COLUMN "paymentMethod" DROP NOT NULL,
ALTER COLUMN "settledBy" DROP NOT NULL,
ALTER COLUMN "settledAt" DROP NOT NULL,
ALTER COLUMN "settledAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "settlement_items" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "shippingFee" DOUBLE PRECISION NOT NULL,
    "driverCommission" DOUBLE PRECISION,
    "itemAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlement_items_settlementId_idx" ON "settlement_items"("settlementId");

-- CreateIndex
CREATE INDEX "settlement_items_orderId_idx" ON "settlement_items"("orderId");

-- CreateIndex
CREATE INDEX "Order_outsourceId_idx" ON "Order"("outsourceId");

-- CreateIndex
CREATE INDEX "settlements_userId_idx" ON "settlements"("userId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_outsourceId_fkey" FOREIGN KEY ("outsourceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
