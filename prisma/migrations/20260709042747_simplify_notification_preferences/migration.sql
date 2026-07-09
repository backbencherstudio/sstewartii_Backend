-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM_ALERT', 'VENDOR_UPDATE', 'CUSTOMER_REPORT', 'NEW_ORDER', 'ORDER_CANCELLATION', 'NEW_FOLLOWER', 'NEW_REVIEW', 'UPCOMING_EVENT', 'HIGH_TRAFFIC_OPPORTUNITY', 'APP_UPDATE', 'SUBSCRIPTION_BILLING', 'ORDER_CONFIRMED', 'READY_FOR_PICKUP', 'FAVORITE_TRUCK_LIVE', 'NEW_TRUCK_NEARBY', 'EVENT_FESTIVAL', 'FAVORITE_TRUCK_LEAVING', 'PROMOTION_DISCOUNT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsAlerts" BOOLEAN NOT NULL DEFAULT false,
    "inAppBanner" BOOLEAN NOT NULL DEFAULT true,
    "doNotDisturbEnabled" BOOLEAN NOT NULL DEFAULT false,
    "doNotDisturbStart" TEXT,
    "doNotDisturbEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemAlertsEmail" BOOLEAN NOT NULL DEFAULT true,
    "systemAlertsSms" BOOLEAN NOT NULL DEFAULT false,
    "systemAlertsInApp" BOOLEAN NOT NULL DEFAULT true,
    "vendorUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "vendorUpdatesSms" BOOLEAN NOT NULL DEFAULT false,
    "vendorUpdatesInApp" BOOLEAN NOT NULL DEFAULT true,
    "customerReportsEmail" BOOLEAN NOT NULL DEFAULT true,
    "customerReportsSms" BOOLEAN NOT NULL DEFAULT false,
    "customerReportsInApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newOrdersEmail" BOOLEAN NOT NULL DEFAULT true,
    "newOrdersSms" BOOLEAN NOT NULL DEFAULT true,
    "newOrdersInApp" BOOLEAN NOT NULL DEFAULT true,
    "cancellationsEmail" BOOLEAN NOT NULL DEFAULT true,
    "cancellationsSms" BOOLEAN NOT NULL DEFAULT true,
    "cancellationsInApp" BOOLEAN NOT NULL DEFAULT true,
    "newFollowersEmail" BOOLEAN NOT NULL DEFAULT true,
    "newFollowersSms" BOOLEAN NOT NULL DEFAULT false,
    "newFollowersInApp" BOOLEAN NOT NULL DEFAULT true,
    "newReviewsEmail" BOOLEAN NOT NULL DEFAULT true,
    "newReviewsSms" BOOLEAN NOT NULL DEFAULT false,
    "newReviewsInApp" BOOLEAN NOT NULL DEFAULT true,
    "upcomingEventsEmail" BOOLEAN NOT NULL DEFAULT true,
    "upcomingEventsSms" BOOLEAN NOT NULL DEFAULT false,
    "upcomingEventsInApp" BOOLEAN NOT NULL DEFAULT true,
    "highTrafficOpportunitiesEmail" BOOLEAN NOT NULL DEFAULT true,
    "highTrafficOpportunitiesSms" BOOLEAN NOT NULL DEFAULT false,
    "highTrafficOpportunitiesInApp" BOOLEAN NOT NULL DEFAULT true,
    "appUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "appUpdatesSms" BOOLEAN NOT NULL DEFAULT false,
    "appUpdatesInApp" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionBillingEmail" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionBillingSms" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionBillingInApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorNotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderConfirmedEmail" BOOLEAN NOT NULL DEFAULT true,
    "orderConfirmedSms" BOOLEAN NOT NULL DEFAULT true,
    "orderConfirmedInApp" BOOLEAN NOT NULL DEFAULT true,
    "readyForPickupEmail" BOOLEAN NOT NULL DEFAULT true,
    "readyForPickupSms" BOOLEAN NOT NULL DEFAULT true,
    "readyForPickupInApp" BOOLEAN NOT NULL DEFAULT true,
    "favoriteTruckLiveEmail" BOOLEAN NOT NULL DEFAULT true,
    "favoriteTruckLiveSms" BOOLEAN NOT NULL DEFAULT false,
    "favoriteTruckLiveInApp" BOOLEAN NOT NULL DEFAULT true,
    "newTrucksNearbyEmail" BOOLEAN NOT NULL DEFAULT true,
    "newTrucksNearbySms" BOOLEAN NOT NULL DEFAULT false,
    "newTrucksNearbyInApp" BOOLEAN NOT NULL DEFAULT true,
    "eventsFestivalsEmail" BOOLEAN NOT NULL DEFAULT true,
    "eventsFestivalsSms" BOOLEAN NOT NULL DEFAULT false,
    "eventsFestivalsInApp" BOOLEAN NOT NULL DEFAULT true,
    "favoriteTruckLeavingEmail" BOOLEAN NOT NULL DEFAULT true,
    "favoriteTruckLeavingSms" BOOLEAN NOT NULL DEFAULT true,
    "favoriteTruckLeavingInApp" BOOLEAN NOT NULL DEFAULT true,
    "promotionsDiscountsEmail" BOOLEAN NOT NULL DEFAULT true,
    "promotionsDiscountsSms" BOOLEAN NOT NULL DEFAULT false,
    "promotionsDiscountsInApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE INDEX "NotificationSettings_userId_idx" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminNotificationPreferences_userId_key" ON "AdminNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "AdminNotificationPreferences_userId_idx" ON "AdminNotificationPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorNotificationPreferences_userId_key" ON "VendorNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "VendorNotificationPreferences_userId_idx" ON "VendorNotificationPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerNotificationPreferences_userId_key" ON "CustomerNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "CustomerNotificationPreferences_userId_idx" ON "CustomerNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

-- CreateIndex
CREATE INDEX "NotificationLog_scheduledFor_idx" ON "NotificationLog"("scheduledFor");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotificationPreferences" ADD CONSTRAINT "AdminNotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNotificationPreferences" ADD CONSTRAINT "VendorNotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNotificationPreferences" ADD CONSTRAINT "CustomerNotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
