/*
  Warnings:

  - You are about to drop the column `provider` on the `SubscriptionTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `rawProviderData` on the `SubscriptionTransaction` table. All the data in the column will be lost.
  - The `store` column on the `SubscriptionTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `stripeCustomerId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionExpiry` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionPlanId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `Vendor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[revenueCatEventId]` on the table `SubscriptionTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vendorSubscriptionId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventTimestamp` to the `SubscriptionTransaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `productId` on table `SubscriptionTransaction` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'SUCCESS', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('NORMAL', 'TRIAL', 'INTRO');

-- CreateEnum
CREATE TYPE "SubscriptionTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_subscriptionPlanId_fkey";

-- DropIndex
DROP INDEX "Vendor_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Vendor_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "SubscriptionTransaction" DROP COLUMN "provider",
DROP COLUMN "rawProviderData",
ADD COLUMN     "environment" TEXT,
ADD COLUMN     "eventTimestamp" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "expirationAt" TIMESTAMP(3),
ADD COLUMN     "isFamilyShare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTrialPeriod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalTransactionId" TEXT,
ADD COLUMN     "periodType" "PeriodType" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "priceInPurchasedCurrency" DOUBLE PRECISION,
ADD COLUMN     "rawData" JSONB,
ADD COLUMN     "renewalNumber" INTEGER,
ADD COLUMN     "revenueCatEventId" TEXT,
ADD COLUMN     "revenueCatProductId" TEXT,
ADD COLUMN     "status" "SubscriptionTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
DROP COLUMN "store",
ADD COLUMN     "store" TEXT,
ALTER COLUMN "productId" SET NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
DROP COLUMN "subscriptionExpiry",
DROP COLUMN "subscriptionPlanId",
DROP COLUMN "subscriptionStatus",
ADD COLUMN     "vendorSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "VendorSubscription" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cancellationDate" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isTrialPeriod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRenewalDate" TIMESTAMP(3),
ALTER COLUMN "provider" SET DEFAULT 'REVENUECAT',
ALTER COLUMN "status" SET DEFAULT 'INACTIVE';

-- CreateTable
CREATE TABLE "RevenueCatWebhookLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "eventType" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT,
    "store" TEXT,
    "environment" TEXT,
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueCatWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueCatWebhookLog_eventId_key" ON "RevenueCatWebhookLog"("eventId");

-- CreateIndex
CREATE INDEX "RevenueCatWebhookLog_eventType_idx" ON "RevenueCatWebhookLog"("eventType");

-- CreateIndex
CREATE INDEX "RevenueCatWebhookLog_vendorId_idx" ON "RevenueCatWebhookLog"("vendorId");

-- CreateIndex
CREATE INDEX "RevenueCatWebhookLog_createdAt_idx" ON "RevenueCatWebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "RevenueCatWebhookLog_status_idx" ON "RevenueCatWebhookLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTransaction_revenueCatEventId_key" ON "SubscriptionTransaction"("revenueCatEventId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_vendorSubscriptionId_idx" ON "SubscriptionTransaction"("vendorSubscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_productId_idx" ON "SubscriptionTransaction"("productId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_transactionId_idx" ON "SubscriptionTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_status_idx" ON "SubscriptionTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorSubscriptionId_key" ON "Vendor"("vendorSubscriptionId");

-- CreateIndex
CREATE INDEX "VendorSubscription_vendorId_idx" ON "VendorSubscription"("vendorId");

-- CreateIndex
CREATE INDEX "VendorSubscription_status_idx" ON "VendorSubscription"("status");

-- CreateIndex
CREATE INDEX "VendorSubscription_expiresAt_idx" ON "VendorSubscription"("expiresAt");

-- AddForeignKey
ALTER TABLE "SubscriptionTransaction" ADD CONSTRAINT "SubscriptionTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTransaction" ADD CONSTRAINT "SubscriptionTransaction_vendorSubscriptionId_fkey" FOREIGN KEY ("vendorSubscriptionId") REFERENCES "VendorSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
