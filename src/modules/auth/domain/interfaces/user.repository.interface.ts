
import { User } from '../entities/user.entity';
import { UserWithRelations } from '../types/user-with-relations.type';
import {
  SubscriptionStatus,
  SubscriptionStore,
  SubscriptionProvider,
} from '@prisma/client';

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

// ✅ Define the subscription plan type
export interface SubscriptionPlanView {
  id: string;
  name: string;
  code: string;
  durationDays: number;
  maxProducts: number;
  price: number;
  currency: string;
  revenueCatEntitlementId: string | null;
}

// ✅ Define the full subscription type with plan
export interface VendorSubscriptionView {
  id: string;
  status: SubscriptionStatus;
  isActive: boolean;
  isTrialPeriod: boolean;
  autoRenew: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  expiresAt: Date | null;
  lastRenewalDate: Date | null;
  cancellationDate: Date | null;
  revenueCatAppUserId: string | null;
  entitlementId: string | null;
  productId: string | null;
  store: SubscriptionStore | null;
  provider: SubscriptionProvider;
  subscriptionPlan: SubscriptionPlanView | null;
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

  // ✅ UPDATED: Get vendor subscription with full details and plan
  getVendorSubscription(
    vendorId: string,
  ): Promise<VendorSubscriptionView | null>;
}
