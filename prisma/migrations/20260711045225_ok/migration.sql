/*
  Warnings:

  - You are about to drop the column `customerReportsEmail` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `customerReportsInApp` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `customerReportsSms` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `systemAlertsEmail` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `systemAlertsInApp` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `systemAlertsSms` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `vendorUpdatesEmail` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `vendorUpdatesInApp` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `vendorUpdatesSms` on the `AdminNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `eventsFestivalsEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `eventsFestivalsInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `eventsFestivalsSms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTruckLeavingEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTruckLeavingInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTruckLeavingSms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTruckLiveEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTruckLiveInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteTruckLiveSms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newTrucksNearbyEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newTrucksNearbyInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newTrucksNearbySms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `orderConfirmedEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `orderConfirmedInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `orderConfirmedSms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `promotionsDiscountsEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `promotionsDiscountsInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `promotionsDiscountsSms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `pushNotificationsEnabled` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `readyForPickupEmail` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `readyForPickupInApp` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `readyForPickupSms` on the `CustomerNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `emailNotifications` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `inAppBanner` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `smsAlerts` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `appUpdatesEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `appUpdatesInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `appUpdatesSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationsEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationsInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationsSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `highTrafficOpportunitiesEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `highTrafficOpportunitiesInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `highTrafficOpportunitiesSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newFollowersEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newFollowersInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newFollowersSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newOrdersEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newOrdersInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newOrdersSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newReviewsEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newReviewsInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `newReviewsSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `pushNotificationsEnabled` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionBillingEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionBillingInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionBillingSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `upcomingEventsEmail` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `upcomingEventsInApp` on the `VendorNotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `upcomingEventsSms` on the `VendorNotificationPreferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AdminNotificationPreferences" DROP COLUMN "customerReportsEmail",
DROP COLUMN "customerReportsInApp",
DROP COLUMN "customerReportsSms",
DROP COLUMN "systemAlertsEmail",
DROP COLUMN "systemAlertsInApp",
DROP COLUMN "systemAlertsSms",
DROP COLUMN "vendorUpdatesEmail",
DROP COLUMN "vendorUpdatesInApp",
DROP COLUMN "vendorUpdatesSms",
ADD COLUMN     "customerReportsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "systemAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vendorUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CustomerNotificationPreferences" DROP COLUMN "eventsFestivalsEmail",
DROP COLUMN "eventsFestivalsInApp",
DROP COLUMN "eventsFestivalsSms",
DROP COLUMN "favoriteTruckLeavingEmail",
DROP COLUMN "favoriteTruckLeavingInApp",
DROP COLUMN "favoriteTruckLeavingSms",
DROP COLUMN "favoriteTruckLiveEmail",
DROP COLUMN "favoriteTruckLiveInApp",
DROP COLUMN "favoriteTruckLiveSms",
DROP COLUMN "newTrucksNearbyEmail",
DROP COLUMN "newTrucksNearbyInApp",
DROP COLUMN "newTrucksNearbySms",
DROP COLUMN "orderConfirmedEmail",
DROP COLUMN "orderConfirmedInApp",
DROP COLUMN "orderConfirmedSms",
DROP COLUMN "promotionsDiscountsEmail",
DROP COLUMN "promotionsDiscountsInApp",
DROP COLUMN "promotionsDiscountsSms",
DROP COLUMN "pushNotificationsEnabled",
DROP COLUMN "readyForPickupEmail",
DROP COLUMN "readyForPickupInApp",
DROP COLUMN "readyForPickupSms",
ADD COLUMN     "eventsFestivalsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "favoriteTruckLeavingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "favoriteTruckLiveEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newTrucksNearbyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "orderConfirmedEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "promotionsDiscountsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "readyForPickupEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "NotificationSettings" DROP COLUMN "emailNotifications",
DROP COLUMN "inAppBanner",
DROP COLUMN "smsAlerts";

-- AlterTable
ALTER TABLE "VendorNotificationPreferences" DROP COLUMN "appUpdatesEmail",
DROP COLUMN "appUpdatesInApp",
DROP COLUMN "appUpdatesSms",
DROP COLUMN "cancellationsEmail",
DROP COLUMN "cancellationsInApp",
DROP COLUMN "cancellationsSms",
DROP COLUMN "highTrafficOpportunitiesEmail",
DROP COLUMN "highTrafficOpportunitiesInApp",
DROP COLUMN "highTrafficOpportunitiesSms",
DROP COLUMN "newFollowersEmail",
DROP COLUMN "newFollowersInApp",
DROP COLUMN "newFollowersSms",
DROP COLUMN "newOrdersEmail",
DROP COLUMN "newOrdersInApp",
DROP COLUMN "newOrdersSms",
DROP COLUMN "newReviewsEmail",
DROP COLUMN "newReviewsInApp",
DROP COLUMN "newReviewsSms",
DROP COLUMN "pushNotificationsEnabled",
DROP COLUMN "subscriptionBillingEmail",
DROP COLUMN "subscriptionBillingInApp",
DROP COLUMN "subscriptionBillingSms",
DROP COLUMN "upcomingEventsEmail",
DROP COLUMN "upcomingEventsInApp",
DROP COLUMN "upcomingEventsSms",
ADD COLUMN     "appUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cancellationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "highTrafficOpportunitiesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newFollowersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newReviewsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subscriptionBillingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "upcomingEventsEnabled" BOOLEAN NOT NULL DEFAULT true;
