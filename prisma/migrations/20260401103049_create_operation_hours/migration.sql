-- CreateTable
CREATE TABLE "OperationHour" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationHour_vendorId_dayOfWeek_key" ON "OperationHour"("vendorId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "OperationHour" ADD CONSTRAINT "OperationHour_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
