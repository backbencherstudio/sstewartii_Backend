import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { FirebaseService } from '@/common/firebase/firebase.service';
import { NotificationGateway } from '../infrastructure/gateways/notification.gateway';
import {
  CreateNotificationDto,
  NotificationListResponseDto,
  NotificationResponseDto,
  RegisterDeviceDto,
  UpdateAdminNotificationPreferencesDto,
  UpdateCustomerNotificationPreferencesDto,
  UpdateNotificationSettingsDto,
  UpdateVendorNotificationPreferencesDto,
} from '../presentation/dto/notification.dto';
import type { INotificationRepository } from '../domain/interface/notification.repository.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
    private readonly firebaseService: FirebaseService,
  ) {}

  // ============================================
  // CORE NOTIFICATION METHODS
  // ============================================

  async send(
    userId: string,
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<NotificationResponseDto | null> {
    // Check if user wants this notification
    const shouldSend = await this.shouldSendNotification(
      userId,
      dto.type,
      dto.channel,
    );

    // ALWAYS save to database (even if preferences are off)
    const notification = await this.notificationRepository.create({
      userId,
      type: dto.type,
      channel: dto.channel,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
    });

    // Only deliver if user wants it
    if (shouldSend) {
      await this.deliverNotification(userId, notification, dto);
    } else {
      this.logger.log(
        `⏭️ Notification saved to DB but delivery skipped for user ${userId} (preferences off)`,
      );
    }

    return this.toResponseDto(notification);
  }

  async sendBulk(
    userIds: string[],
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<{ count: number }> {
    let sentCount = 0;
    for (const userId of userIds) {
      try {
        const result = await this.send(userId, dto);
        if (result) sentCount++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to send to ${userId}: ${message}`);
      }
    }
    return { count: sentCount };
  }

  // ============================================
  // DELIVERY METHODS
  // ============================================

  private async deliverNotification(
    userId: string,
    notification: any,
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    const isOnline = this.notificationGateway.isUserOnline(userId);

    // WebSocket delivery
    if (isOnline) {
      this.notificationGateway.sendToUser(userId, notification);
      await this.notificationRepository.updateStatus({
        notificationId: notification.id,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });
    }

    // Firebase push delivery
    if (dto.channel === NotificationChannel.PUSH) {
      await this.sendPushNotification(userId, notification, dto);
    }

    // Update unread count
    if (isOnline) {
      await this.notificationGateway.sendUnreadCount(userId);
    }
  }

  private async sendPushNotification(
    userId: string,
    notification: any,
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcm_token: true },
    });

    if (!user?.fcm_token) return;

    const unreadCount = await this.notificationRepository.countUnread(userId);
    const payload = {
      title: dto.title,
      body: dto.body,
      data: { ...dto.data, notificationId: notification.id, type: dto.type },
      sound: 'default',
      badge: unreadCount + 1,
    };

    const result = await this.firebaseService.sendToDevice(
      user.fcm_token,
      payload,
    );

    if (result.success) {
      await this.notificationRepository.updateStatus({
        notificationId: notification.id,
        status: 'SENT',
      });
    } else if (result.error === 'INVALID_TOKEN') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcm_token: null },
      });
      this.logger.warn(`Invalid FCM token for user ${userId}`);
    }
  }

  // ============================================
  // PREFERENCE CHECKING - FIXED
  // ============================================

  private async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    // Only check PUSH notifications
    if (channel !== NotificationChannel.PUSH) {
      return true;
    }

    // 1. Check role-specific master toggle (pushNotificationsEnabled)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return false;

    const roleName = user.role?.name;
    let pushEnabled = true;

    switch (roleName) {
      case 'ADMIN': {
        const prefs = await this.prisma.adminNotificationPreferences.findUnique(
          {
            where: { userId },
          },
        );
        pushEnabled = prefs?.pushNotificationsEnabled ?? true;
        break;
      }
      case 'VENDOR': {
        const prefs =
          await this.prisma.vendorNotificationPreferences.findUnique({
            where: { userId },
          });
        pushEnabled = prefs?.pushNotificationsEnabled ?? true;
        break;
      }
      case 'USER': {
        const prefs =
          await this.prisma.customerNotificationPreferences.findUnique({
            where: { userId },
          });
        pushEnabled = prefs?.pushNotificationsEnabled ?? true;
        break;
      }
      default: {
        pushEnabled = true;
      }
    }

    // If master toggle is off, don't send any notifications
    if (!pushEnabled) {
      this.logger.log(`⏭️ Push notifications disabled for user ${userId}`);
      return false;
    }

    // 2. Check Do Not Disturb
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (settings?.doNotDisturbEnabled && this.isInDoNotDisturb(settings)) {
      this.logger.log(`⏭️ Do Not Disturb active for user ${userId}`);
      return false;
    }

    // 3. Check specific notification type preference
    return this.checkRolePreference(userId, type);
  }

  private isInDoNotDisturb(settings: any): boolean {
    if (!settings.doNotDisturbStart || !settings.doNotDisturbEnd) return false;

    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = settings.doNotDisturbStart;
    const end = settings.doNotDisturbEnd;

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const currentMin = toMinutes(current);
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    if (startMin <= endMin) {
      return currentMin >= startMin && currentMin <= endMin;
    }
    return currentMin >= startMin || currentMin <= endMin;
  }

  private async checkRolePreference(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return false;

    const roleName = user.role?.name;

    if (roleName === 'ADMIN') return this.checkAdminPreference(userId, type);
    if (roleName === 'VENDOR') return this.checkVendorPreference(userId, type);
    if (roleName === 'USER') return this.checkCustomerPreference(userId, type);

    return true;
  }

  // ============================================
  // ADMIN PREFERENCE CHECK
  // ============================================

  private async checkAdminPreference(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const prefs = await this.prisma.adminNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) return true;

    const typeMap: Record<string, string> = {
      SYSTEM_ALERT: 'systemAlertsEnabled',
      VENDOR_UPDATE: 'vendorUpdatesEnabled',
      CUSTOMER_REPORT: 'customerReportsEnabled',
    };

    const field = typeMap[type];
    if (!field) return true;

    return (prefs as any)[field] as boolean;
  }

  // ============================================
  // VENDOR PREFERENCE CHECK
  // ============================================

  private async checkVendorPreference(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const prefs = await this.prisma.vendorNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) return true;

    const typeMap: Record<string, string> = {
      NEW_ORDER: 'newOrdersEnabled',
      ORDER_CANCELLATION: 'cancellationsEnabled',
      NEW_FOLLOWER: 'newFollowersEnabled',
      NEW_REVIEW: 'newReviewsEnabled',
      UPCOMING_EVENT: 'upcomingEventsEnabled',
      HIGH_TRAFFIC_OPPORTUNITY: 'highTrafficOpportunitiesEnabled',
      APP_UPDATE: 'appUpdatesEnabled',
      SUBSCRIPTION_BILLING: 'subscriptionBillingEnabled',
    };

    const field = typeMap[type];
    if (!field) return true;

    return (prefs as any)[field] as boolean;
  }

  // ============================================
  // CUSTOMER PREFERENCE CHECK
  // ============================================

  private async checkCustomerPreference(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const prefs = await this.prisma.customerNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) return true;

    const typeMap: Record<string, string> = {
      ORDER_CONFIRMED: 'orderConfirmedEnabled',
      READY_FOR_PICKUP: 'readyForPickupEnabled',
      FAVORITE_TRUCK_LIVE: 'favoriteTruckLiveEnabled',
      NEW_TRUCK_NEARBY: 'newTrucksNearbyEnabled',
      EVENT_FESTIVAL: 'eventsFestivalsEnabled',
      FAVORITE_TRUCK_LEAVING: 'favoriteTruckLeavingEnabled',
      PROMOTION_DISCOUNT: 'promotionsDiscountsEnabled',
    };

    const field = typeMap[type];
    if (!field) return true;

    return (prefs as any)[field] as boolean;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
    type?: NotificationType,
    status?: NotificationStatus,
  ): Promise<NotificationListResponseDto> {
    const offset = (page - 1) * limit;
    const { notifications, total } =
      await this.notificationRepository.findByUserId(userId, {
        type,
        status,
        limit,
        offset,
      });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      notifications: notifications.map((n) => this.toResponseDto(n)),
    };
  }

  async markAsRead(
    userId: string,
    notificationIds: string[],
  ): Promise<{ count: number }> {
    const count = await this.notificationRepository.markAsRead(notificationIds);
    await this.notificationGateway.sendUnreadCount(userId);
    return count;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.markAllAsRead(userId);
    await this.notificationGateway.sendUnreadCount(userId);
    return count;
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.notificationRepository.countUnread(userId);
    return { unreadCount: count };
  }

  // ============================================
  // DEVICE MANAGEMENT
  // ============================================

  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ message: string }> {
    const isValid = this.firebaseService.validateToken(dto.fcmToken);
    if (!isValid) throw new BadRequestException('Invalid FCM token');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fcm_token: dto.fcmToken,
        platform: dto.platform,
      },
    });

    this.logger.log(`✅ Device registered for user ${userId}`);
    return { message: 'Device registered successfully' };
  }

  async unregisterDevice(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fcm_token: null,
        platform: null,
      },
    });

    this.logger.log(`❌ Device unregistered for user ${userId}`);
    return { message: 'Device unregistered successfully' };
  }

  // ============================================
  // SETTINGS MANAGEMENT - FIXED
  // ============================================

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create base settings (DND only)
    let baseSettings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!baseSettings) {
      baseSettings = await this.prisma.notificationSettings.create({
        data: { userId },
      });
    }

    // Get role-specific preferences
    const roleName = user.role?.name;
    let rolePreferences: any = null;

    switch (roleName) {
      case 'ADMIN':
        rolePreferences =
          await this.prisma.adminNotificationPreferences.findUnique({
            where: { userId },
          });
        if (!rolePreferences) {
          rolePreferences =
            await this.prisma.adminNotificationPreferences.create({
              data: { userId },
            });
        }
        break;

      case 'VENDOR':
        rolePreferences =
          await this.prisma.vendorNotificationPreferences.findUnique({
            where: { userId },
          });
        if (!rolePreferences) {
          rolePreferences =
            await this.prisma.vendorNotificationPreferences.create({
              data: { userId },
            });
        }
        break;

      case 'USER':
        rolePreferences =
          await this.prisma.customerNotificationPreferences.findUnique({
            where: { userId },
          });
        if (!rolePreferences) {
          rolePreferences =
            await this.prisma.customerNotificationPreferences.create({
              data: { userId },
            });
        }
        break;

      default:
        rolePreferences = null;
    }

    return this.formatSettingsResponse(roleName, baseSettings, rolePreferences);
  }

  // ============================================
  // FORMAT SETTINGS RESPONSE - FIXED
  // ============================================

  private formatSettingsResponse(
    roleName: string,
    baseSettings: any,
    rolePreferences: any,
  ) {
    // Base settings only contains DND settings
    const base = {
      id: baseSettings.id,
      doNotDisturbEnabled: baseSettings.doNotDisturbEnabled,
      doNotDisturbStart: baseSettings.doNotDisturbStart,
      doNotDisturbEnd: baseSettings.doNotDisturbEnd,
    };

    switch (roleName) {
      case 'ADMIN':
        return {
          role: 'ADMIN',
          base,
          preferences: {
            pushNotificationsEnabled:
              rolePreferences.pushNotificationsEnabled ?? true,
            systemAlertsEnabled: rolePreferences.systemAlertsEnabled ?? true,
            vendorUpdatesEnabled: rolePreferences.vendorUpdatesEnabled ?? true,
            customerReportsEnabled:
              rolePreferences.customerReportsEnabled ?? true,
          },
        };

      case 'VENDOR':
        return {
          role: 'VENDOR',
          base,
          preferences: {
            pushNotificationsEnabled:
              rolePreferences.pushNotificationsEnabled ?? true,
            orderUpdates: {
              newOrdersEnabled: rolePreferences.newOrdersEnabled ?? true,
              cancellationsEnabled:
                rolePreferences.cancellationsEnabled ?? true,
            },
            customerEngagement: {
              newFollowersEnabled: rolePreferences.newFollowersEnabled ?? true,
              newReviewsEnabled: rolePreferences.newReviewsEnabled ?? true,
            },
            eventOpportunity: {
              upcomingEventsEnabled:
                rolePreferences.upcomingEventsEnabled ?? true,
              highTrafficOpportunitiesEnabled:
                rolePreferences.highTrafficOpportunitiesEnabled ?? true,
            },
            systemAlerts: {
              appUpdatesEnabled: rolePreferences.appUpdatesEnabled ?? true,
              subscriptionBillingEnabled:
                rolePreferences.subscriptionBillingEnabled ?? true,
            },
          },
        };

      case 'USER':
        return {
          role: 'USER',
          base,
          preferences: {
            pushNotificationsEnabled:
              rolePreferences.pushNotificationsEnabled ?? true,
            orderUpdates: {
              orderConfirmedEnabled:
                rolePreferences.orderConfirmedEnabled ?? true,
              readyForPickupEnabled:
                rolePreferences.readyForPickupEnabled ?? true,
            },
            discoveryAlerts: {
              favoriteTruckLiveEnabled:
                rolePreferences.favoriteTruckLiveEnabled ?? true,
              newTrucksNearbyEnabled:
                rolePreferences.newTrucksNearbyEnabled ?? true,
              eventsFestivalsEnabled:
                rolePreferences.eventsFestivalsEnabled ?? true,
            },
            urgentAlerts: {
              favoriteTruckLeavingEnabled:
                rolePreferences.favoriteTruckLeavingEnabled ?? true,
            },
            marketing: {
              promotionsDiscountsEnabled:
                rolePreferences.promotionsDiscountsEnabled ?? true,
            },
          },
        };

      default:
        return {
          role: roleName || 'UNKNOWN',
          base,
          preferences: null,
        };
    }
  }

  // ============================================
  // UPDATE SETTINGS
  // ============================================

  async updateSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<any> {
    await this.prisma.notificationSettings.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });

    return this.getSettings(userId);
  }

  async updateAdminPrefs(
    userId: string,
    dto: UpdateAdminNotificationPreferencesDto,
  ): Promise<any> {
    await this.prisma.adminNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });

    return this.getSettings(userId);
  }

  async updateVendorPrefs(
    userId: string,
    dto: UpdateVendorNotificationPreferencesDto,
  ): Promise<any> {
    await this.prisma.vendorNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });

    return this.getSettings(userId);
  }

  async updateCustomerPrefs(
    userId: string,
    dto: UpdateCustomerNotificationPreferencesDto,
  ): Promise<any> {
    await this.prisma.customerNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });

    return this.getSettings(userId);
  }

  // ============================================
  // HELPERS
  // ============================================

  private toResponseDto(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      channel: notification.channel,
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, any>,
      status: notification.status,
      sentAt: notification.sentAt,
      readAt: notification.readAt,
      deliveredAt: notification.deliveredAt,
    };
  }
}
