-- CreateEnum
CREATE TYPE "VendorLiveStatus" AS ENUM ('ONLINE', 'TEMPORARILY_CLOSED', 'OFFLINE');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "status" "VendorLiveStatus" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3);
