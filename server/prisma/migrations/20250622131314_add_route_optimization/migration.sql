/*
  Warnings:

  - You are about to drop the column `merchantId` on the `financial_transactions` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[trackingNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trackingNumber` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `financial_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userType` to the `financial_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_outsourceId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_driverId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleAssignment" DROP CONSTRAINT "VehicleAssignment_driverId_fkey";

-- DropForeignKey
ALTER TABLE "financial_transactions" DROP CONSTRAINT "financial_transactions_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "merchant_balances" DROP CONSTRAINT "merchant_balances_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_settledBy_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_userId_fkey";

-- DropIndex
DROP INDEX "financial_transactions_merchantId_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "driverCommission" DOUBLE PRECISION,
ADD COLUMN     "driverCommissionAmount" DOUBLE PRECISION,
ADD COLUMN     "outsourceCommission" DOUBLE PRECISION,
ADD COLUMN     "outsourceCommissionAmount" DOUBLE PRECISION,
ADD COLUMN     "trackingNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "financial_transactions" DROP COLUMN "merchantId",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "userType" TEXT NOT NULL;

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpires" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "companyName" TEXT,
    "companyDetails" JSONB,
    "driverAvailability" "DriverAvailability",
    "licenseNumber" TEXT,
    "deliveryCommission" INTEGER,
    "lastLogin" TIMESTAMP(3),
    "loginHistory" JSONB,
    "refreshToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_geocache" (
    "id" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "area" TEXT,
    "governorate" TEXT,
    "cleanedAddress" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googlePlaceId" TEXT,
    "formattedAddress" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "isGeocoded" BOOLEAN NOT NULL DEFAULT false,
    "geocodeAttempts" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION,
    "accuracyType" TEXT,
    "geocodedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_geocache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteOptimizations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "routeOptimized" BOOLEAN NOT NULL DEFAULT false,
    "optimizedAt" TIMESTAMP(3),
    "estimatedDuration" TEXT,
    "estimatedDistance" TEXT,
    "optimizationData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteOptimizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_configKey_key" ON "system_config"("configKey");

-- CreateIndex
CREATE INDEX "system_config_configKey_idx" ON "system_config"("configKey");

-- CreateIndex
CREATE UNIQUE INDEX "address_geocache_addressHash_key" ON "address_geocache"("addressHash");

-- CreateIndex
CREATE INDEX "address_geocache_addressHash_idx" ON "address_geocache"("addressHash");

-- CreateIndex
CREATE INDEX "address_geocache_area_governorate_idx" ON "address_geocache"("area", "governorate");

-- CreateIndex
CREATE INDEX "address_geocache_isValid_isGeocoded_idx" ON "address_geocache"("isValid", "isGeocoded");

-- CreateIndex
CREATE INDEX "address_geocache_createdAt_idx" ON "address_geocache"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteOptimizations_driverId_key" ON "RouteOptimizations"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingNumber_key" ON "Order"("trackingNumber");

-- CreateIndex
CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber");

-- CreateIndex
CREATE INDEX "financial_transactions_userId_idx" ON "financial_transactions"("userId");

-- CreateIndex
CREATE INDEX "financial_transactions_userType_idx" ON "financial_transactions"("userType");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_outsourceId_fkey" FOREIGN KEY ("outsourceId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_balances" ADD CONSTRAINT "merchant_balances_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteOptimizations" ADD CONSTRAINT "RouteOptimizations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
