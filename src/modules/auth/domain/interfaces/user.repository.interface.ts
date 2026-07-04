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
  findByEmail(email: string): Promise<User | null>;

  findById(id: string): Promise<User | null>;

  create(user: User, roleType: 'USER' | 'VENDOR'): Promise<User>;

  updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void>;

  getRefreshToken(userId: string): Promise<string | null>;

  update(userId: string, updateDate: Partial<User>): Promise<User>;

  findLoginUserByEmail(email: string): Promise<LoginUserView | null>;

  findLoginUserById(userId: string): Promise<UserWithRelations | null>;
}
