export interface UserProps {
  id: string;
  email: string;
  password?: string | null;
  roleId?: string;
  role?: any;

  googleId?: string | null;
  provider?: string;

  permissions?: string[];
  refreshToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  public id: string;
  public email: string;
  public password?: string | null ;
  public roleId?: string;
  public role?: any;

  public googleId?: string | null;
  public provider?: string;

  public permissions?: string[];
  public refreshToken?: string | null;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.password = props.password;
    this.roleId = props.roleId;
    this.role = props.role;

    this.googleId = props.googleId,
    this.provider = props.provider || 'LOCAL',

    this.permissions = props.permissions;
    this.refreshToken = props.refreshToken;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}