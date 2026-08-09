-- CreateEnum
CREATE TYPE "VendorSubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PaymentFailureType" AS ENUM ('CARD_EXPIRED', 'INSUFFICIENT_FUNDS', 'DECLINED', 'PAYMENT_METHOD_REMOVED', 'BILLING_ADDRESS_INVALID', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionAction" AS ENUM ('INITIAL_SUBSCRIPTION', 'RENEWAL', 'CANCELLATION', 'EXPIRATION', 'GRACE_PERIOD_START', 'GRACE_PERIOD_END', 'REACTIVATION', 'ADMIN_SUSPEND', 'ADMIN_REACTIVATE', 'PAYMENT_FAILURE', 'PAYMENT_SUCCESS');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "lastPaymentFailureAt" TIMESTAMP(3),
ADD COLUMN     "lastSubscriptionCheck" TIMESTAMP(3),
ADD COLUMN     "paymentFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionPausedAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "VendorSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PaymentFailureLog" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "failureType" "PaymentFailureType" NOT NULL,
    "errorMessage" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationType" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentFailureLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "action" "SubscriptionAction" NOT NULL,
    "oldStatus" "VendorSubscriptionStatus" NOT NULL,
    "newStatus" "VendorSubscriptionStatus" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentFailureLog_vendorId_idx" ON "PaymentFailureLog"("vendorId");

-- CreateIndex
CREATE INDEX "PaymentFailureLog_createdAt_idx" ON "PaymentFailureLog"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentFailureLog_resolvedAt_idx" ON "PaymentFailureLog"("resolvedAt");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_vendorId_idx" ON "SubscriptionHistory"("vendorId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_createdAt_idx" ON "SubscriptionHistory"("createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_action_idx" ON "SubscriptionHistory"("action");

-- AddForeignKey
ALTER TABLE "PaymentFailureLog" ADD CONSTRAINT "PaymentFailureLog_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
