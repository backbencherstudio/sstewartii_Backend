-- CreateTable
CREATE TABLE "VendorProfileView" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "customerId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorProfileView_vendorId_idx" ON "VendorProfileView"("vendorId");

-- CreateIndex
CREATE INDEX "VendorProfileView_customerId_idx" ON "VendorProfileView"("customerId");

-- CreateIndex
CREATE INDEX "VendorProfileView_viewedAt_idx" ON "VendorProfileView"("viewedAt");

-- AddForeignKey
ALTER TABLE "VendorProfileView" ADD CONSTRAINT "VendorProfileView_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfileView" ADD CONSTRAINT "VendorProfileView_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
