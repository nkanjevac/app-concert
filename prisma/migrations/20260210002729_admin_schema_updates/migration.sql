/*
  Warnings:

  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Currency` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Venue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AppSettings"
  ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Category" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Currency" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Currency" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "Currency" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "SeatingRegion" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Venue" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "Venue" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Currency_isEnabled_idx" ON "Currency"("isEnabled");

-- CreateIndex
CREATE INDEX "Event_categoryId_idx" ON "Event"("categoryId");

-- CreateIndex
CREATE INDEX "PromoCode_status_idx" ON "PromoCode"("status");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "ReservationItem_reservationId_idx" ON "ReservationItem"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationItem_regionId_idx" ON "ReservationItem"("regionId");

-- CreateIndex
CREATE INDEX "SeatingRegion_venueId_idx" ON "SeatingRegion"("venueId");

-- CreateIndex
CREATE INDEX "ShowPrice_showId_idx" ON "ShowPrice"("showId");

-- CreateIndex
CREATE INDEX "ShowPrice_regionId_idx" ON "ShowPrice"("regionId");
