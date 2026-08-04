-- AlterTable
ALTER TABLE "OperationHour" ADD COLUMN     "customLeavingTime" TEXT,
ADD COLUMN     "leavingSoonEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leavingSoonMinutes" INTEGER NOT NULL DEFAULT 30;
