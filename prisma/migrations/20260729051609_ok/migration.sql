/*
  Warnings:

  - You are about to drop the column `selfieImageUrl` on the `KycProfile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SelfiePose" AS ENUM ('FRONT', 'LEFT', 'RIGHT', 'SMILE');

-- AlterTable
ALTER TABLE "KycProfile" DROP COLUMN "selfieImageUrl",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "KycSelfieImage" (
    "id" TEXT NOT NULL,
    "kycProfileId" TEXT NOT NULL,
    "pose" "SelfiePose" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycSelfieImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycSelfieImage_kycProfileId_idx" ON "KycSelfieImage"("kycProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "KycSelfieImage_kycProfileId_pose_key" ON "KycSelfieImage"("kycProfileId", "pose");

-- AddForeignKey
ALTER TABLE "KycSelfieImage" ADD CONSTRAINT "KycSelfieImage_kycProfileId_fkey" FOREIGN KEY ("kycProfileId") REFERENCES "KycProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
