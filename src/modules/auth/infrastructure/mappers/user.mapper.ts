import { User } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(raw: any): User {
    const extractedPermissions =
      raw.role?.permissions?.map((rp: any) => rp.permission.name) || [];

    return new User({
      id: raw.id,
      email: raw.email,
      password: raw.password,
      name: raw.name,
      roleId: raw.roleId,
      role: raw.role,
      isEmailVerified: raw.isEmailVerified,

      googleId: raw.googleId,
      provider: raw.provider,

      fcm_token: raw.fcm_token ?? null,
      platform: raw.platform ?? null,

      permissions: extractedPermissions,
      refreshToken: raw.refreshToken,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,

      isDeleted: raw.isDeleted ?? false,
      deletionScheduledAt: raw.deletionScheduledAt ?? null,
      deletionReason: raw.deletionReason ?? null,
    });
  }
}
