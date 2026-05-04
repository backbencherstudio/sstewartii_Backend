export class VendorMenuProductResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  estimateCookTime!: number;
  image?: string;
  categoryName?: string;
}

export class VendorMenuSectionResponseDto {
  categoryId!: string;
  categoryName!: string;
  products!: VendorMenuProductResponseDto[];
}

export class VendorMenuVendorInfoResponseDto {
  id!: string;
  businessName!: string;
  coverImage?: string;
  bio?: string;
  cityLabel?: string;
  distanceKm?: number;
  isOpen!: boolean;
  statusLabel!: string;
  reviewAverage!: number;
  reviewCount!: number;
  cuisines!: string[];
}

export class VendorMenuResponseDto {
  vendor!: VendorMenuVendorInfoResponseDto;
  sections!: VendorMenuSectionResponseDto[];
}

export class VendorInfoOpeningHourResponseDto {
  dayOfWeek!: number;
  dayLabel!: string;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed!: boolean;
}

export class VendorInfoSocialLinkResponseDto {
  platform!: string;
  url!: string;
}

export class VendorInfoResponseDto {
  id!: string;
  bio?: string;
  publicEmail?: string;
  contactNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  openingHours!: VendorInfoOpeningHourResponseDto[];
  socialLinks!: VendorInfoSocialLinkResponseDto[];
}

export class TruckGalleryImageResponseDto {
  id!: string;
  url?: string;
  caption?: string;
  isPrimary!: boolean;
  position!: number;
  createdAt!: Date;
}

export class UploadTruckGalleryResponseDto {
  message!: string;
}

export class TruckGalleryResponseDto {
  vendorId!: string;
  items!: TruckGalleryImageResponseDto[];
}

import {
  KycStatus,
  SubscriptionStatus,
  VerificationStatus,
} from '@prisma/client';

export class VendorHomeProfileDto {
  id!: string;
  businessName!: string;
  coverImage?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export class VendorHomeVerificationDto {
  isLimitedMode!: boolean;
  kycStatus!: KycStatus;
  businessVerificationStatus?: VerificationStatus;
  subscriptionStatus!: SubscriptionStatus;
  onboardingStep!: number;
  actionRequired!: boolean;
  title?: string;
  message?: string;
  buttonText?: string;
}

export class VendorHomeLiveStatusDto {
  canGoLive!: boolean;
  isLive!: boolean;
  disabledReason?: string;
}

export class VendorHomeStatsDto {
  todaySale!: number;
  ordersCompleted!: number;
  pendingOrders!: number;
  cancelledOrders!: number;
}

export class VendorHomeLocationDto {
  address?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export class VendorHomeResponseDto {
  vendor!: VendorHomeProfileDto;
  verification!: VendorHomeVerificationDto;
  liveStatus!: VendorHomeLiveStatusDto;
  stats!: VendorHomeStatsDto;
  currentLocation?: VendorHomeLocationDto;
  unreadNotificationCount!: number;
}

