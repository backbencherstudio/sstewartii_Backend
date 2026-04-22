-- CreateTable
CREATE TABLE "FavoriteVendor" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteVendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteVendor_customerId_idx" ON "FavoriteVendor"("customerId");

-- CreateIndex
CREATE INDEX "FavoriteVendor_vendorId_idx" ON "FavoriteVendor"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteVendor_customerId_vendorId_key" ON "FavoriteVendor"("customerId", "vendorId");

-- AddForeignKey
ALTER TABLE "FavoriteVendor" ADD CONSTRAINT "FavoriteVendor_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteVendor" ADD CONSTRAINT "FavoriteVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
