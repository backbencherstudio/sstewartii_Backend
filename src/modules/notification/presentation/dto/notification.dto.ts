import { ApiProperty } from '@nestjs/swagger';
import {
  DevicePlatform,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
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
// NOTIFICATION SETTINGS DTOs - SIMPLIFIED
// ============================================

// ============================================
// BASE SETTINGS
// ============================================

export class UpdateNotificationSettingsDto {
  @ApiProperty({ required: false, description: 'Enable Do Not Disturb mode' })
  @IsOptional()
  @IsBoolean()
  doNotDisturbEnabled?: boolean;

  @ApiProperty({
    required: false,
    example: '22:00',
    description: 'Do Not Disturb start time (24h format)',
  })
  @IsOptional()
  @IsString()
  doNotDisturbStart?: string;

  @ApiProperty({
    required: false,
    example: '07:00',
    description: 'Do Not Disturb end time (24h format)',
  })
  @IsOptional()
  @IsString()
  doNotDisturbEnd?: string;
}

// ============================================
// ADMIN PREFERENCES
// ============================================

export class UpdateAdminNotificationPreferencesDto {
  @ApiProperty({
    required: false,
    description: 'Master toggle for all push notifications',
  })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'System alerts (critical system notifications)',
  })
  @IsOptional()
  @IsBoolean()
  systemAlertsEnabled?: boolean;

  @ApiProperty({ required: false, description: 'Vendor updates' })
  @IsOptional()
  @IsBoolean()
  vendorUpdatesEnabled?: boolean;

  @ApiProperty({ required: false, description: 'Customer reports' })
  @IsOptional()
  @IsBoolean()
  customerReportsEnabled?: boolean;
}

// ============================================
// VENDOR PREFERENCES
// ============================================

export class UpdateVendorNotificationPreferencesDto {
  @ApiProperty({
    required: false,
    description: 'Master toggle for all push notifications',
  })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  // Order Updates
  @ApiProperty({
    required: false,
    description: 'New orders - instant alerts for new customer orders',
  })
  @IsOptional()
  @IsBoolean()
  newOrdersEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Cancellations - notifications for retracted orders',
  })
  @IsOptional()
  @IsBoolean()
  cancellationsEnabled?: boolean;

  // Customer Engagement
  @ApiProperty({
    required: false,
    description:
      'New followers - get notified when someone favorites your truck',
  })
  @IsOptional()
  @IsBoolean()
  newFollowersEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'New reviews - alerts for new reviews from customers',
  })
  @IsOptional()
  @IsBoolean()
  newReviewsEnabled?: boolean;

  // Event & Opportunity
  @ApiProperty({
    required: false,
    description:
      'Upcoming city events - alerts for festivals, concerts, and major gatherings',
  })
  @IsOptional()
  @IsBoolean()
  upcomingEventsEnabled?: boolean;

  @ApiProperty({
    required: false,
    description:
      'High-traffic opportunities - predicted high-demand zones nearby',
  })
  @IsOptional()
  @IsBoolean()
  highTrafficOpportunitiesEnabled?: boolean;

  // System Alerts
  @ApiProperty({
    required: false,
    description: 'App updates - get notified when system updates',
  })
  @IsOptional()
  @IsBoolean()
  appUpdatesEnabled?: boolean;

  @ApiProperty({
    required: false,
    description:
      'Subscription billing - notification after subscription payout',
  })
  @IsOptional()
  @IsBoolean()
  subscriptionBillingEnabled?: boolean;
}

// ============================================
// CUSTOMER PREFERENCES
// ============================================

export class UpdateCustomerNotificationPreferencesDto {
  @ApiProperty({
    required: false,
    description: 'Master toggle for all push notifications',
  })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  // Order Updates
  @ApiProperty({
    required: false,
    description: 'Order confirmed - order placed successfully',
  })
  @IsOptional()
  @IsBoolean()
  orderConfirmedEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Ready for pickup - order is ready for collection',
  })
  @IsOptional()
  @IsBoolean()
  readyForPickupEnabled?: boolean;

  // Discovery Alerts
  @ApiProperty({
    required: false,
    description: 'Favorite truck live - your favorite truck is now live',
  })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLiveEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'New trucks nearby - new food trucks in your area',
  })
  @IsOptional()
  @IsBoolean()
  newTrucksNearbyEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Events & festivals - alerts for upcoming events',
  })
  @IsOptional()
  @IsBoolean()
  eventsFestivalsEnabled?: boolean;

  // Urgent Alerts
  @ApiProperty({
    required: false,
    description: 'Favorite truck leaving - your favorite truck is leaving soon',
  })
  @IsOptional()
  @IsBoolean()
  favoriteTruckLeavingEnabled?: boolean;

  // Marketing
  @ApiProperty({
    required: false,
    description: 'Promotions & discounts - special offers and discounts',
  })
  @IsOptional()
  @IsBoolean()
  promotionsDiscountsEnabled?: boolean;
}

// ============================================
// DEVICE REGISTRATION
// ============================================

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM token for push notifications' })
  @IsString()
  fcmToken!: string;

  @ApiProperty({ enum: DevicePlatform, description: 'Device platform' })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}

// ============================================
// SETTINGS RESPONSE DTOs
// ============================================

export class BaseSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Master toggle for all push notifications' })
  pushNotificationsEnabled!: boolean;

  @ApiProperty({ description: 'Enable Do Not Disturb mode' })
  doNotDisturbEnabled!: boolean;

  @ApiProperty({
    nullable: true,
    description: 'Do Not Disturb start time (24h format)',
  })
  doNotDisturbStart!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Do Not Disturb end time (24h format)',
  })
  doNotDisturbEnd!: string | null;
}

export class AdminPreferencesResponseDto {
  @ApiProperty({ description: 'System alerts (critical system notifications)' })
  systemAlertsEnabled!: boolean;

  @ApiProperty({ description: 'Vendor updates' })
  vendorUpdatesEnabled!: boolean;

  @ApiProperty({ description: 'Customer reports' })
  customerReportsEnabled!: boolean;
}

export class VendorPreferencesResponseDto {
  // Order Updates
  @ApiProperty({
    description: 'New orders - instant alerts for new customer orders',
  })
  newOrdersEnabled!: boolean;

  @ApiProperty({
    description: 'Cancellations - notifications for retracted orders',
  })
  cancellationsEnabled!: boolean;

  // Customer Engagement
  @ApiProperty({
    description:
      'New followers - get notified when someone favorites your truck',
  })
  newFollowersEnabled!: boolean;

  @ApiProperty({
    description: 'New reviews - alerts for new reviews from customers',
  })
  newReviewsEnabled!: boolean;

  // Event & Opportunity
  @ApiProperty({
    description:
      'Upcoming city events - alerts for festivals, concerts, and major gatherings',
  })
  upcomingEventsEnabled!: boolean;

  @ApiProperty({
    description:
      'High-traffic opportunities - predicted high-demand zones nearby',
  })
  highTrafficOpportunitiesEnabled!: boolean;

  // System Alerts
  @ApiProperty({
    description: 'App updates - get notified when system updates',
  })
  appUpdatesEnabled!: boolean;

  @ApiProperty({
    description:
      'Subscription billing - notification after subscription payout',
  })
  subscriptionBillingEnabled!: boolean;
}

export class CustomerPreferencesResponseDto {
  // Order Updates
  @ApiProperty({ description: 'Order confirmed - order placed successfully' })
  orderConfirmedEnabled!: boolean;

  @ApiProperty({
    description: 'Ready for pickup - order is ready for collection',
  })
  readyForPickupEnabled!: boolean;

  // Discovery Alerts
  @ApiProperty({
    description: 'Favorite truck live - your favorite truck is now live',
  })
  favoriteTruckLiveEnabled!: boolean;

  @ApiProperty({
    description: 'New trucks nearby - new food trucks in your area',
  })
  newTrucksNearbyEnabled!: boolean;

  @ApiProperty({
    description: 'Events & festivals - alerts for upcoming events',
  })
  eventsFestivalsEnabled!: boolean;

  // Urgent Alerts
  @ApiProperty({
    description: 'Favorite truck leaving - your favorite truck is leaving soon',
  })
  favoriteTruckLeavingEnabled!: boolean;

  // Marketing
  @ApiProperty({
    description: 'Promotions & discounts - special offers and discounts',
  })
  promotionsDiscountsEnabled!: boolean;
}

// ============================================
// SETTINGS RESPONSE WRAPPER - FIXED
// ============================================

export class NotificationSettingsResponseDto {
  @ApiProperty({ enum: ['ADMIN', 'VENDOR', 'USER'] })
  role!: string;

  @ApiProperty({ type: BaseSettingsResponseDto })
  base!: BaseSettingsResponseDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Role-specific preferences',
  })
  preferences!: any;
}
