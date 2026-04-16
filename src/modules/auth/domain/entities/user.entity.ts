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

  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  public id: string;
  public email: string;
  public password?: string | null ;
  public name!: string;
  public roleId?: string;
  public role?: any;

  public googleId?: string | null;
  public appleId?: string | null;
  public provider?: string;

  public permissions?: string[];
  public refreshToken?: string | null;

  public isEmailVerified: boolean;

  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.password = props.password;
    this.roleId = props.roleId;
    this.role = props.role;

    this.googleId = props.googleId,
    this.appleId = props.appleId,
    this.provider = props.provider || 'LOCAL',

    this.permissions = props.permissions;
    this.refreshToken = props.refreshToken;

    this.isEmailVerified = props.isEmailVerified ?? false;

    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}