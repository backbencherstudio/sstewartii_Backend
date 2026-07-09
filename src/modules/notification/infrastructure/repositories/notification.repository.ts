import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  INotificationRepository,
  ICreateNotification,
  IUpdateNotificationStatus,
  INotificationFilters,
  INotification,
} from '../../domain/interface/notification.repository.interface';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateNotification): Promise<INotification> {
    const result = await this.prisma.notificationLog.create({
      data: {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        title: data.title,
        body: data.body,
        data: data.data || {},
        scheduledFor: data.scheduledFor,
        status: 'PENDING',
      },
    });

    return this.mapToINotification(result);
  }

  async createMany(data: ICreateNotification[]): Promise<{ count: number }> {
    const result = await this.prisma.notificationLog.createMany({
      data: data.map((item) => ({
        userId: item.userId,
        type: item.type,
        channel: item.channel,
        title: item.title,
        body: item.body,
        data: item.data || {},
        scheduledFor: item.scheduledFor,
        status: 'PENDING',
      })),
    });

    return { count: result.count };
  }

  async findById(id: string): Promise<INotification | null> {
    const result = await this.prisma.notificationLog.findUnique({
      where: { id },
    });
    return result ? this.mapToINotification(result) : null;
  }

  async findByUserId(
    userId: string,
    filters?: INotificationFilters,
  ): Promise<{ notifications: INotification[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const where: any = { userId };

    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.sentAt = {};
      if (filters.startDate) where.sentAt.gte = filters.startDate;
      if (filters.endDate) where.sentAt.lte = filters.endDate;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => this.mapToINotification(n)),
      total,
    };
  }

  async updateStatus(data: IUpdateNotificationStatus): Promise<INotification> {
    const result = await this.prisma.notificationLog.update({
      where: { id: data.notificationId },
      data: {
        status: data.status,
        error: data.error,
        deliveredAt: data.deliveredAt,
        readAt: data.readAt,
      },
    });

    return this.mapToINotification(result);
  }

  async markAsRead(notificationIds: string[]): Promise<{ count: number }> {
    const result = await this.prisma.notificationLog.updateMany({
      where: {
        id: { in: notificationIds },
        readAt: null,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notificationLog.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async countUnread(userId: string): Promise<number> {
    return await this.prisma.notificationLog.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async deleteOldNotifications(daysOld: number): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notificationLog.deleteMany({
      where: {
        sentAt: { lt: cutoffDate },
        status: { in: ['SENT', 'READ', 'DELIVERED'] },
      },
    });

    return { count: result.count };
  }

  // Helper to map Prisma result to INotification
  private mapToINotification(data: any): INotification {
    return {
      id: data.id,
      userId: data.userId,
      type: data.type,
      channel: data.channel,
      title: data.title,
      body: data.body,
      data: data.data as Record<string, any> | null,
      status: data.status,
      error: data.error,
      sentAt: data.sentAt,
      readAt: data.readAt,
      deliveredAt: data.deliveredAt,
      scheduledFor: data.scheduledFor,
    };
  }
}
