/*
  Warnings:

  - A unique constraint covering the columns `[purchaseEventId]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "purchaseEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_purchaseEventId_key" ON "Reservation"("purchaseEventId");
