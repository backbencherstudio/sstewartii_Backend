/*
  Warnings:

  - You are about to drop the column `verifiedAt` on the `KycProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KycProfile" DROP COLUMN "verifiedAt",
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT,
ADD COLUMN     "selfieImageUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "frontImageUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "KycProfile_vendorId_idx" ON "KycProfile"("vendorId");
