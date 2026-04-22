-- CreateTable
CREATE TABLE "FavoriteProduct" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteProduct_customerId_idx" ON "FavoriteProduct"("customerId");

-- CreateIndex
CREATE INDEX "FavoriteProduct_productId_idx" ON "FavoriteProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteProduct_customerId_productId_key" ON "FavoriteProduct"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "FavoriteProduct" ADD CONSTRAINT "FavoriteProduct_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteProduct" ADD CONSTRAINT "FavoriteProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
