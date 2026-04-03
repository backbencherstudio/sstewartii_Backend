-- CreateTable
CREATE TABLE "OperationHour" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationHour_vendorId_dayOfWeek_activeFrom_activeTo_idx" ON "OperationHour"("vendorId", "dayOfWeek", "activeFrom", "activeTo");

-- AddForeignKey
ALTER TABLE "OperationHour" ADD CONSTRAINT "OperationHour_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
