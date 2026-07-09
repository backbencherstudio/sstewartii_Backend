import { User } from '../entities/user.entity';
import { UserWithRelations } from '../types/user-with-relations.type';

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

  customer?: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  } | null;

  vendorStore?: {
    id: string;
    serviceArea?: {
      id: string;
      latitude: number;
      longitude: number;
      address: string | null;
      radius: number;
    } | null;
  } | null;
}

export interface IUserRepository {
  // --- Basic CRUD ---
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: User, roleType: 'USER' | 'VENDOR'): Promise<User>;
  update(userId: string, updateData: Partial<User>): Promise<User>;

  // --- Refresh token management ---
  updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void>;
  getRefreshToken(userId: string): Promise<string | null>;

  // --- Login views ---
  findLoginUserByEmail(email: string): Promise<LoginUserView | null>;
  findLoginUserById(userId: string): Promise<UserWithRelations | null>;

  // --- Change Password ---
  findUserWithPassword(userId: string): Promise<{
    id: string;
    password: string | null;
    isDeleted: boolean;
    deletionScheduledAt: Date | null;
  } | null>;

  updatePassword(userId: string, hashedPassword: string): Promise<void>;

  // --- Delete Account (soft-delete) ---
  permanentlyDeleteUser(userId: string): Promise<void>;
  findUserByEmailForLogin(email: string): Promise<any>;
  updateDeletionSchedule(
    userId: string,
    scheduledAt: Date,
    reason?: string,
  ): Promise<void>;
  clearDeletionSchedule(userId: string): Promise<void>;

  // Now includes email in the return type
  findUsersScheduledForDeletion(
    beforeDate: Date,
  ): Promise<{ id: string; email: string }[]>;

  // --- Vendor order check (optional for deletion constraints) ---
  countPendingOrdersForVendor(vendorId: string): Promise<number>;
}
