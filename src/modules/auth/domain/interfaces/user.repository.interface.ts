// src/modules/auth/domain/interfaces/user.repository.interface.ts

import { User } from '../entities/user.entity';
import { UserWithRelations } from '../types/user-with-relations.type';
import { SubscriptionStatus } from '@prisma/client';

export interface LoginUserView {
  id: string;
  email: string;
  password: string | null;
  name: string | null;
  provider: string;
  isEmailVerified: boolean;
  role: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  } | null;
  vendorStore: {
    id: string;
    serviceArea: {
      id: string;
      latitude: number | null;
      longitude: number | null;
      address: string | null;
      radius: number | null;
    } | null;
  } | null;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findLoginUserByEmail(email: string): Promise<LoginUserView | null>;
  update(userId: string, updateData: Partial<User>): Promise<User>;
  create(user: User, roleType: 'USER' | 'VENDOR'): Promise<User>;
  findById(id: string): Promise<User | null>;
  getRefreshToken(userId: string): Promise<string | null>;
  updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void>;
  findLoginUserById(userId: string): Promise<UserWithRelations | null>;
  findUserWithPassword(userId: string): Promise<{
    id: string;
    password: string | null;
    isDeleted: boolean;
    deletionScheduledAt: Date | null;
  } | null>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  updateDeletionSchedule(
    userId: string,
    scheduledAt: Date,
    reason?: string,
  ): Promise<void>;
  clearDeletionSchedule(userId: string): Promise<void>;
  permanentlyDeleteUser(userId: string): Promise<void>;
  findUsersScheduledForDeletion(
    beforeDate: Date,
  ): Promise<{ id: string; email: string }[]>;
  findUserByEmailForLogin(email: string): Promise<any>;
  countPendingOrdersForVendor(vendorId: string): Promise<number>;

  // ✅ NEW: Get vendor subscription
  getVendorSubscription(vendorId: string): Promise<{
    status: SubscriptionStatus;
    expiresAt: Date | null;
  } | null>;

  // Optional: Get vendor subscription with plan details
  getVendorSubscriptionWithPlan?(vendorId: string): Promise<{
    id: string;
    status: SubscriptionStatus;
    expiresAt: Date | null;
    subscriptionPlan: {
      id: string;
      name: string;
      code: string;
      price: number;
      currency: string;
    } | null;
  } | null>;
}
