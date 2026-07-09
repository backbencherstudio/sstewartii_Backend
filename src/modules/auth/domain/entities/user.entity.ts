export class User {
  public id: string;
  public email: string;
  public password?: string | null;
  public name!: string;
  public roleId?: string;
  public role?: any;
  public fcm_token?: string | null;
  public platform?: string | null;
  public googleId?: string | null;
  public appleId?: string | null;
  public provider?: string;
  public permissions?: string[];
  public refreshToken?: string | null;
  public isEmailVerified: boolean;

  // ✅ Add these properties
  public isDeleted?: boolean;
  public deletionScheduledAt?: Date | null;
  public deletionReason?: string | null;

  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.password = props.password;
    this.roleId = props.roleId;
    this.role = props.role;
    this.googleId = props.googleId ?? null;
    this.appleId = props.appleId ?? null;
    this.provider = props.provider || 'LOCAL';
    this.permissions = props.permissions;
    this.refreshToken = props.refreshToken ?? null;
    this.isEmailVerified = props.isEmailVerified ?? false;

    // ✅ Initialize deletion properties
    this.isDeleted = props.isDeleted ?? false;
    this.deletionScheduledAt = props.deletionScheduledAt ?? null;
    this.deletionReason = props.deletionReason ?? null;
    this.fcm_token = props.fcm_token ?? null;
    this.platform = props.platform ?? null;

    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export interface UserProps {
  id: string;
  email: string;
  password?: string | null;
  name: string;
  roleId?: string;
  role?: any;
  googleId?: string | null;
  appleId?: string | null;
  provider?: string;
  permissions?: string[];
  refreshToken?: string | null;
  isEmailVerified?: boolean;
  fcm_token?: string | null;
  platform?: string | null;

  // ✅ Add these to the interface
  isDeleted?: boolean;
  deletionScheduledAt?: Date | null;
  deletionReason?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}
