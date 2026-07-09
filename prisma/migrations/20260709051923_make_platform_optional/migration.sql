-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fcm_token" TEXT,
ADD COLUMN     "platform" "DevicePlatform";
