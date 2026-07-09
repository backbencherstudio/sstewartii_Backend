import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from '@/modules/notification/application/notification.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationHelperService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send notification to a single user
   */
  async sendToUser(
    userId: string,
    data: {
      title: string;
      body: string;
      type: NotificationType;
      channel?: NotificationChannel;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      await this.notificationService.send(userId, {
        title: data.title,
        body: data.body,
        type: data.type,
        channel: data.channel || NotificationChannel.PUSH,
        data: data.data,
      });
    } catch (error) {
      console.error(`Failed to send notification to ${userId}:`, error);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    data: {
      title: string;
      body: string;
      type: NotificationType;
      channel?: NotificationChannel;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    if (userIds.length === 0) return;

    try {
      await this.notificationService.sendBulk(userIds, {
        title: data.title,
        body: data.body,
        type: data.type,
        channel: data.channel || NotificationChannel.PUSH,
        data: data.data,
      });
    } catch (error) {
      console.error(`Failed to send bulk notifications:`, error);
    }
  }

  /**
   * Send notification to all vendors
   */
  async sendToAllVendors(data: {
    title: string;
    body: string;
    type: NotificationType;
    channel?: NotificationChannel;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const vendors = await this.prisma.user.findMany({
        where: {
          role: {
            name: 'VENDOR',
          },
          isDeleted: false,
        },
        select: { id: true },
      });

      const vendorIds = vendors.map((v) => v.id);
      await this.sendToUsers(vendorIds, data);
    } catch (error) {
      console.error('Failed to send notification to vendors:', error);
    }
  }

  /**
   * Send notification to all customers
   */
  async sendToAllCustomers(data: {
    title: string;
    body: string;
    type: NotificationType;
    channel?: NotificationChannel;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const customers = await this.prisma.user.findMany({
        where: {
          role: {
            name: 'USER',
          },
          isDeleted: false,
        },
        select: { id: true },
      });

      const customerIds = customers.map((c) => c.id);
      await this.sendToUsers(customerIds, data);
    } catch (error) {
      console.error('Failed to send notification to customers:', error);
    }
  }

  /**
   * Send notification to a specific role
   */
  async sendToRole(
    roleName: string,
    data: {
      title: string;
      body: string;
      type: NotificationType;
      channel?: NotificationChannel;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          role: {
            name: roleName,
          },
          isDeleted: false,
        },
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      await this.sendToUsers(userIds, data);
    } catch (error) {
      console.error(`Failed to send notification to role ${roleName}:`, error);
    }
  }

  /**
   * Send notification to vendor's followers
   */
  async sendToVendorFollowers(
    vendorId: string,
    data: {
      title: string;
      body: string;
      type: NotificationType;
      channel?: NotificationChannel;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const followers = await this.prisma.favoriteVendor.findMany({
        where: {
          vendorId: vendorId,
        },
        select: {
          customer: {
            select: {
              userId: true,
            },
          },
        },
      });

      const userIds = followers.map((f) => f.customer.userId);
      await this.sendToUsers(userIds, data);
    } catch (error) {
      console.error(
        `Failed to send notification to followers of vendor ${vendorId}:`,
        error,
      );
    }
  }

  /**
   * Send notification to all users (except admins)
   */
  async sendToAllUsers(data: {
    title: string;
    body: string;
    type: NotificationType;
    channel?: NotificationChannel;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
          role: {
            name: {
              not: 'ADMIN',
            },
          },
        },
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      await this.sendToUsers(userIds, data);
    } catch (error) {
      console.error('Failed to send notification to all users:', error);
    }
  }

  /**
   * Send notification to users near a location (customers only)
   */
  async sendToNearbyCustomers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    data: {
      title: string;
      body: string;
      type: NotificationType;
      channel?: NotificationChannel;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          isActive: true,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          userId: true,
          latitude: true,
          longitude: true,
        },
      });

      const nearbyCustomerIds = customers
        .filter((customer) => {
          if (customer.latitude === null || customer.longitude === null)
            return false;
          const distance = this.calculateDistanceKm(
            latitude,
            longitude,
            customer.latitude,
            customer.longitude,
          );
          return distance <= radiusKm;
        })
        .map((customer) => customer.userId);

      await this.sendToUsers(nearbyCustomerIds, data);
    } catch (error) {
      console.error('Failed to send notification to nearby customers:', error);
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number): number => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }
}
