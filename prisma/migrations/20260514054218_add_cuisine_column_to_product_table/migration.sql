-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cuisineId" TEXT;

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_cuisineId_idx" ON "Product"("cuisineId");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_isDeleted_idx" ON "Product"("isDeleted");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
