/*
  Warnings:

  - You are about to drop the column `pushNotificationsEnabled` on the `NotificationSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AdminNotificationPreferences" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CustomerNotificationPreferences" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "NotificationSettings" DROP COLUMN "pushNotificationsEnabled";

-- AlterTable
ALTER TABLE "VendorNotificationPreferences" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
