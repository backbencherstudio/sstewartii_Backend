-- CreateTable
CREATE TABLE "SubscriptionTransaction" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorSubscriptionId" TEXT,
    "provider" "SubscriptionProvider" NOT NULL,
    "store" "SubscriptionStore",
    "productId" TEXT,
    "transactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "rawProviderData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTransaction_transactionId_key" ON "SubscriptionTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_vendorId_idx" ON "SubscriptionTransaction"("vendorId");

-- CreateIndex
CREATE INDEX "SubscriptionTransaction_purchasedAt_idx" ON "SubscriptionTransaction"("purchasedAt");
