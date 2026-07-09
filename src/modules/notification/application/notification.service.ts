import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  forwardRef,
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
  // PREFERENCE CHECKING
  // ============================================

  private async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) return true;

    // Master & channel toggles
    if (
      !settings.pushNotificationsEnabled &&
      channel === NotificationChannel.PUSH
    )
      return false;
    if (channel === NotificationChannel.EMAIL && !settings.emailNotifications)
      return false;
    if (channel === NotificationChannel.SMS && !settings.smsAlerts)
      return false;
    if (channel === NotificationChannel.IN_APP && !settings.inAppBanner)
      return false;

    // Do Not Disturb
    if (settings.doNotDisturbEnabled && this.isInDoNotDisturb(settings))
      return false;

    // Role-specific preferences
    return this.checkRolePreferences(userId, type, channel);
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

  private async checkRolePreferences(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return false;

    const roleName = user.role?.name;

    if (roleName === 'ADMIN')
      return this.checkAdminPrefs(userId, type, channel);
    if (roleName === 'VENDOR')
      return this.checkVendorPrefs(userId, type, channel);
    if (roleName === 'USER')
      return this.checkCustomerPrefs(userId, type, channel);

    return true;
  }

  private async checkAdminPrefs(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const prefs = await this.prisma.adminNotificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) return true;

    const checks: Record<string, any> = {
      SYSTEM_ALERT: {
        email: prefs.systemAlertsEmail,
        sms: prefs.systemAlertsSms,
        inApp: prefs.systemAlertsInApp,
      },
      VENDOR_UPDATE: {
        email: prefs.vendorUpdatesEmail,
        sms: prefs.vendorUpdatesSms,
        inApp: prefs.vendorUpdatesInApp,
      },
      CUSTOMER_REPORT: {
        email: prefs.customerReportsEmail,
        sms: prefs.customerReportsSms,
        inApp: prefs.customerReportsInApp,
      },
    };

    const check = checks[type];
    if (!check) return true;

    return (
      (channel === 'EMAIL' && check.email) ||
      (channel === 'SMS' && check.sms) ||
      (channel === 'IN_APP' && check.inApp)
    );
  }

  private async checkVendorPrefs(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const prefs = await this.prisma.vendorNotificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) return true;
    if (!prefs.pushNotificationsEnabled && channel === 'PUSH') return false;

    const checks: Record<string, any> = {
      NEW_ORDER: {
        email: prefs.newOrdersEmail,
        sms: prefs.newOrdersSms,
        inApp: prefs.newOrdersInApp,
      },
      ORDER_CANCELLATION: {
        email: prefs.cancellationsEmail,
        sms: prefs.cancellationsSms,
        inApp: prefs.cancellationsInApp,
      },
      NEW_FOLLOWER: {
        email: prefs.newFollowersEmail,
        sms: prefs.newFollowersSms,
        inApp: prefs.newFollowersInApp,
      },
      NEW_REVIEW: {
        email: prefs.newReviewsEmail,
        sms: prefs.newReviewsSms,
        inApp: prefs.newReviewsInApp,
      },
      UPCOMING_EVENT: {
        email: prefs.upcomingEventsEmail,
        sms: prefs.upcomingEventsSms,
        inApp: prefs.upcomingEventsInApp,
      },
      HIGH_TRAFFIC_OPPORTUNITY: {
        email: prefs.highTrafficOpportunitiesEmail,
        sms: prefs.highTrafficOpportunitiesSms,
        inApp: prefs.highTrafficOpportunitiesInApp,
      },
      APP_UPDATE: {
        email: prefs.appUpdatesEmail,
        sms: prefs.appUpdatesSms,
        inApp: prefs.appUpdatesInApp,
      },
      SUBSCRIPTION_BILLING: {
        email: prefs.subscriptionBillingEmail,
        sms: prefs.subscriptionBillingSms,
        inApp: prefs.subscriptionBillingInApp,
      },
    };

    const check = checks[type];
    if (!check) return true;

    return (
      (channel === 'EMAIL' && check.email) ||
      (channel === 'SMS' && check.sms) ||
      (channel === 'IN_APP' && check.inApp)
    );
  }

  private async checkCustomerPrefs(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const prefs = await this.prisma.customerNotificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) return true;
    if (!prefs.pushNotificationsEnabled && channel === 'PUSH') return false;

    const checks: Record<string, any> = {
      ORDER_CONFIRMED: {
        email: prefs.orderConfirmedEmail,
        sms: prefs.orderConfirmedSms,
        inApp: prefs.orderConfirmedInApp,
      },
      READY_FOR_PICKUP: {
        email: prefs.readyForPickupEmail,
        sms: prefs.readyForPickupSms,
        inApp: prefs.readyForPickupInApp,
      },
      FAVORITE_TRUCK_LIVE: {
        email: prefs.favoriteTruckLiveEmail,
        sms: prefs.favoriteTruckLiveSms,
        inApp: prefs.favoriteTruckLiveInApp,
      },
      NEW_TRUCK_NEARBY: {
        email: prefs.newTrucksNearbyEmail,
        sms: prefs.newTrucksNearbySms,
        inApp: prefs.newTrucksNearbyInApp,
      },
      EVENT_FESTIVAL: {
        email: prefs.eventsFestivalsEmail,
        sms: prefs.eventsFestivalsSms,
        inApp: prefs.eventsFestivalsInApp,
      },
      FAVORITE_TRUCK_LEAVING: {
        email: prefs.favoriteTruckLeavingEmail,
        sms: prefs.favoriteTruckLeavingSms,
        inApp: prefs.favoriteTruckLeavingInApp,
      },
      PROMOTION_DISCOUNT: {
        email: prefs.promotionsDiscountsEmail,
        sms: prefs.promotionsDiscountsSms,
        inApp: prefs.promotionsDiscountsInApp,
      },
    };

    const check = checks[type];
    if (!check) return true;

    return (
      (channel === 'EMAIL' && check.email) ||
      (channel === 'SMS' && check.sms) ||
      (channel === 'IN_APP' && check.inApp)
    );
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
  // DEVICE MANAGEMENT (UPDATED FOR USER MODEL)
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
  // SETTINGS MANAGEMENT
  // ============================================

  async getSettings(userId: string) {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      return await this.prisma.notificationSettings.create({
        data: { userId },
      });
    }
    return settings;
  }

  async updateSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<any> {
    return await this.prisma.notificationSettings.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async getAdminPrefs(userId: string) {
    const prefs = await this.prisma.adminNotificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) {
      return await this.prisma.adminNotificationPreferences.create({
        data: { userId },
      });
    }
    return prefs;
  }

  async updateAdminPrefs(
    userId: string,
    dto: UpdateAdminNotificationPreferencesDto,
  ): Promise<any> {
    return await this.prisma.adminNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async getVendorPrefs(userId: string) {
    const prefs = await this.prisma.vendorNotificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) {
      return await this.prisma.vendorNotificationPreferences.create({
        data: { userId },
      });
    }
    return prefs;
  }

  async updateVendorPrefs(
    userId: string,
    dto: UpdateVendorNotificationPreferencesDto,
  ): Promise<any> {
    return await this.prisma.vendorNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async getCustomerPrefs(userId: string) {
    const prefs = await this.prisma.customerNotificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) {
      return await this.prisma.customerNotificationPreferences.create({
        data: { userId },
      });
    }
    return prefs;
  }

  async updateCustomerPrefs(
    userId: string,
    dto: UpdateCustomerNotificationPreferencesDto,
  ): Promise<any> {
    return await this.prisma.customerNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
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
