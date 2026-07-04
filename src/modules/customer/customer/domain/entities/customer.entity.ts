export interface CustomerEntity {
  id: string;
  userId: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  address?: string;
  latitude?: number;
  longitude?: number;
  avatar?: string;
  isActive: boolean;
  preferredRadius?: number;
}
