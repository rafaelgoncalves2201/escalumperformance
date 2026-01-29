-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(65,30) NOT NULL,
    "minOrderValue" DECIMAL(65,30),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_businessId_idx" ON "Promotion"("businessId");
CREATE INDEX "Promotion_businessId_active_idx" ON "Promotion"("businessId", "active");

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
