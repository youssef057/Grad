-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'PREPAID');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('ELECTRONICS', 'CLOTHES', 'FOOD', 'BOOKS', 'COSMETICS', 'ACCESSORIES', 'OTHER');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerNameAr" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerAlternativePhone" TEXT,
    "customerEmail" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryAddressAr" TEXT,
    "deliveryArea" TEXT NOT NULL,
    "deliveryAreaAr" TEXT,
    "deliveryGovernorate" TEXT NOT NULL,
    "deliveryGovernorateAr" TEXT,
    "deliveryFloor" TEXT,
    "deliveryFloorAr" TEXT,
    "deliveryLandmarks" TEXT,
    "deliveryLandmarksAr" TEXT,
    "packageDescription" TEXT,
    "packageDescriptionAr" TEXT,
    "packageType" "PackageType" NOT NULL,
    "allowOpening" BOOLEAN NOT NULL,
    "productPrice" DOUBLE PRECISION NOT NULL,
    "shippingFee" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "pickupAddress" TEXT,
    "pickupAddressAr" TEXT,
    "pickupTime" TEXT,
    "pickupNotes" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveryTimeWindow" TEXT,
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleId" TEXT,
    "driverId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedBy" TEXT,
    "pickedUpAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "specialInstructions" TEXT,
    "specialInstructionsAr" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_merchantId_idx" ON "Order"("merchantId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_vehicleId_idx" ON "Order"("vehicleId");

-- CreateIndex
CREATE INDEX "Order_driverId_idx" ON "Order"("driverId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
