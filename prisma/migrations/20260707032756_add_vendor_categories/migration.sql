/*
  Warnings:

  - A unique constraint covering the columns `[vendorId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vendorId` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "vendorId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Category_vendorId_idx" ON "Category"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_vendorId_name_key" ON "Category"("vendorId", "name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
