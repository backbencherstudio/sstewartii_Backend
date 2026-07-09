import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform, NotificationChannel, NotificationType } from '@prisma/client';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  IsObject,
} from 'class-validator';

// export enum NotificationType {
//   // Admin types
//   SYSTEM_ALERT = 'SYSTEM_ALERT',
//   VENDOR_UPDATE = 'VENDOR_UPDATE',
//   CUSTOMER_REPORT = 'CUSTOMER_REPORT',

//   // Vendor types
//   NEW_ORDER = 'NEW_ORDER',
//   ORDER_CANCELLATION = 'ORDER_CANCELLATION',
//   NEW_FOLLOWER = 'NEW_FOLLOWER',
//   NEW_REVIEW = 'NEW_REVIEW',
//   UPCOMING_EVENT = 'UPCOMING_EVENT',
//   HIGH_TRAFFIC_OPPORTUNITY = 'HIGH_TRAFFIC_OPPORTUNITY',
//   APP_UPDATE = 'APP_UPDATE',
//   SUBSCRIPTION_BILLING = 'SUBSCRIPTION_BILLING',

//   // Customer types
//   ORDER_CONFIRMED = 'ORDER_CONFIRMED',
//   READY_FOR_PICKUP = 'READY_FOR_PICKUP',
//   FAVORITE_TRUCK_LIVE = 'FAVORITE_TRUCK_LIVE',
//   NEW_TRUCK_NEARBY = 'NEW_TRUCK_NEARBY',
//   EVENT_FESTIVAL = 'EVENT_FESTIVAL',
//   FAVORITE_TRUCK_LEAVING = 'FAVORITE_TRUCK_LEAVING',
//   PROMOTION_DISCOUNT = 'PROMOTION_DISCOUNT',
// }

// export enum NotificationChannel {
//   EMAIL = 'EMAIL',
//   SMS = 'SMS',
//   IN_APP = 'IN_APP',
//   PUSH = 'PUSH',
// }

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

// ============================================
// BASE NOTIFICATION DTOs
// ============================================

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'New order from Marcus (#8842)' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '2 items • $20.80' })
  @IsString()
  body!: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ required: false })
  data?: Record<string, any>;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty()
  sentAt!: Date;

  @ApiProperty({ required: false })
  readAt?: Date;

  @ApiProperty({ required: false })
  deliveredAt?: Date;
}

export class NotificationListResponseDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty({ type: [NotificationResponseDto] })
  notifications!: NotificationResponseDto[];
}

export class MarkNotificationReadDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds!: string[];
}

export class UnreadCountResponseDto {
  @ApiProperty()
  unreadCount!: number;
}

// ============================================
// NOTIFICATION SETTINGS DTOs
// ============================================

// Base Settings
export class UpdateNotificationSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  smsAlerts?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  inAppBanner?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  doNotDisturbEnabled?: boolean;

  @ApiProperty({ required: false, example: '22:00' })
  @IsOptional()
  @IsString()
  doNotDisturbStart?: string;

  @ApiProperty({ required: false, example: '07:00' })
  @IsOptional()
  @IsString()
  doNotDisturbEnd?: string;
}

// Admin Settings
export class UpdateAdminNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  systemAlertsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  systemAlertsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  systemAlertsInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  vendorUpdatesEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  vendorUpdatesSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  vendorUpdatesInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  customerReportsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  customerReportsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  customerReportsInApp?: boolean;
}

// Vendor Settings
export class UpdateVendorNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  // Order Updates
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newOrdersEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newOrdersSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newOrdersInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  cancellationsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  cancellationsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  cancellationsInApp?: boolean;

  // Customer Engagement
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newFollowersEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newFollowersSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newFollowersInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newReviewsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newReviewsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newReviewsInApp?: boolean;

  // Events & Opportunities
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  upcomingEventsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  upcomingEventsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  upcomingEventsInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  highTrafficOpportunitiesEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  highTrafficOpportunitiesSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  highTrafficOpportunitiesInApp?: boolean;

  // System Alerts
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  appUpdatesEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  appUpdatesSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  appUpdatesInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  subscriptionBillingEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  subscriptionBillingSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  subscriptionBillingInApp?: boolean;
}

// Customer Settings
export class UpdateCustomerNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  // Order Updates
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  orderConfirmedEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  orderConfirmedSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  orderConfirmedInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readyForPickupEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readyForPickupSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readyForPickupInApp?: boolean;

  // Discovery Alerts
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLiveEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLiveSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLiveInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newTrucksNearbyEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newTrucksNearbySms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newTrucksNearbyInApp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  eventsFestivalsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  eventsFestivalsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  eventsFestivalsInApp?: boolean;

  // Urgent Alerts
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLeavingEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLeavingSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLeavingInApp?: boolean;

  // Marketing
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  promotionsDiscountsEmail?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  promotionsDiscountsSms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  promotionsDiscountsInApp?: boolean;
}

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM token for push notifications' })
  @IsString()
  fcmToken!: string;

  @ApiProperty({ enum: DevicePlatform, description: 'Device platform' })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}