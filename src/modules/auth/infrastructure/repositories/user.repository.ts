import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IUserRepository,
  LoginUserView,
} from '../../domain/interfaces/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';
import { UserWithRelations } from '../../domain/types/user-with-relations.type';
import { DevicePlatform, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) return null;

    return UserMapper.toDomain(user);
  }

  async findLoginUserByEmail(email: string): Promise<LoginUserView | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        provider: true,
        isEmailVerified: true,

        role: {
          select: {
            id: true,
            name: true,
          },
        },

        customer: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            address: true,
          },
        },

        vendorStore: {
          select: {
            id: true,
            serviceArea: {
              select: {
                id: true,
                latitude: true,
                longitude: true,
                address: true,
                radius: true,
              },
            },
          },
        },
      },
    });
  }

  async update(userId: string, updateData: Partial<User>): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: updateData.email ?? undefined,
        password: updateData.password ?? undefined,
        name: updateData.name ?? undefined,
        googleId: updateData.googleId ?? undefined,
        appleId: updateData.appleId ?? undefined,
        provider: updateData.provider ?? undefined,
        refreshToken: updateData.refreshToken ?? undefined,
        isEmailVerified: updateData.isEmailVerified ?? undefined,
        fcm_token: updateData.fcm_token ?? undefined,
        platform: (updateData.platform as DevicePlatform) ?? undefined,
      },

      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return UserMapper.toDomain(updatedUser);
  }

  async create(user: User, roleType: 'USER' | 'VENDOR'): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        password: user.password ?? null,
        googleId: user.googleId ?? null,
        appleId: user.appleId ?? null,
        provider: user.provider ?? 'LOCAL',
        fcm_token: user.fcm_token ?? undefined,
        platform: (user.platform as DevicePlatform) ?? undefined,

        role: {
          connect: { name: roleType },
        },
      },
      include: { role: true },
    });

    return UserMapper.toDomain(created);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return UserMapper.toDomain(user);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true },
    });

    if (!user || !user.refreshToken) {
      return null;
    }

    return user.refreshToken;
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async findLoginUserById(userId: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
        customer: true,
        vendorStore: {
          include: {
            serviceArea: true,
          },
        },
      },
    });
  }

  async findUserWithPassword(userId: string): Promise<{
    id: string;
    password: string | null;
    isDeleted: boolean;
    deletionScheduledAt: Date | null;
  } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        isDeleted: true,
        deletionScheduledAt: true,
      },
    });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, refreshToken: null },
    });
  }

  async updateDeletionSchedule(
    userId: string,
    scheduledAt: Date,
    reason?: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionScheduledAt: scheduledAt,
        deletionReason: reason,
      },
    });
  }

  async clearDeletionSchedule(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionScheduledAt: null,
        deletionReason: null,
      },
    });
  }

  async permanentlyDeleteUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        email: `deleted_${userId}@removed.com`,
        password: null,
        refreshToken: null,
        name: 'Deleted User',
        deletionScheduledAt: null,
      },
    });
  }

  async findUsersScheduledForDeletion(
    beforeDate: Date,
  ): Promise<{ id: string; email: string }[]> {
    return this.prisma.user.findMany({
      where: {
        deletionScheduledAt: { lte: beforeDate },
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  async findUserByEmailForLogin(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        provider: true,
        isEmailVerified: true,
        deletionScheduledAt: true,
        role: { select: { id: true, name: true } },
        customer: {
          select: { latitude: true, longitude: true, address: true },
        },
        vendorStore: {
          select: {
            id: true,
            serviceArea: {
              select: {
                latitude: true,
                longitude: true,
                address: true,
                radius: true,
              },
            },
          },
        },
      },
    });
  }

  async countPendingOrdersForVendor(vendorId: string): Promise<number> {
    return this.prisma.order.count({
      where: {
        vendorId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] },
      },
    });
  }

  // ✅ ADD THIS METHOD - Get vendor subscription by vendor ID
  async getVendorSubscription(vendorId: string): Promise<{
    status: SubscriptionStatus;
    expiresAt: Date | null;
  } | null> {
    const subscription = await this.prisma.vendorSubscription.findUnique({
      where: { vendorId },
      select: {
        status: true,
        expiresAt: true,
      },
    });

    return subscription;
  }
}
