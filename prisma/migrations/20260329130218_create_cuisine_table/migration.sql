/*
  Warnings:

  - You are about to drop the column `storeName` on the `Vendor` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Vendor_storeName_key";

-- AlterTable
ALTER TABLE "SocialLink" ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "storeName",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publicEmail" TEXT;

-- CreateTable
CREATE TABLE "Cuisine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Cuisine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCuisine" (
    "vendorId" TEXT NOT NULL,
    "cuisineId" TEXT NOT NULL,

    CONSTRAINT "VendorCuisine_pkey" PRIMARY KEY ("vendorId","cuisineId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cuisine_name_key" ON "Cuisine"("name");

-- AddForeignKey
ALTER TABLE "VendorCuisine" ADD CONSTRAINT "VendorCuisine_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCuisine" ADD CONSTRAINT "VendorCuisine_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
