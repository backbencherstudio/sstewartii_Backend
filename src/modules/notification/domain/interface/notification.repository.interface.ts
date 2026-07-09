import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, any> | null;
  status: NotificationStatus;
  error: string | null;
  sentAt: Date;
  readAt: Date | null;
  deliveredAt: Date | null;
  scheduledFor: Date | null;
}

export interface ICreateNotification {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
}

export interface IUpdateNotificationStatus {
  notificationId: string;
  status: NotificationStatus;
  error?: string;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface INotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface INotificationRepository {
  create(data: ICreateNotification): Promise<INotification>;
  createMany(data: ICreateNotification[]): Promise<{ count: number }>;
  findById(id: string): Promise<INotification | null>;
  findByUserId(
    userId: string,
    filters?: INotificationFilters,
  ): Promise<{ notifications: INotification[]; total: number }>;
  updateStatus(data: IUpdateNotificationStatus): Promise<INotification>;
  markAsRead(notificationIds: string[]): Promise<{ count: number }>;
  markAllAsRead(userId: string): Promise<{ count: number }>;
  countUnread(userId: string): Promise<number>;
  deleteOldNotifications(daysOld: number): Promise<{ count: number }>;
}
