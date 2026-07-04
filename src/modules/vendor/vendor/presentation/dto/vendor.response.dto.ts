import {
  VendorLiveStatus,
  KycStatus,
  SubscriptionStatus,
  VerificationStatus,
} from '@prisma/client';

import { VendorInsightAccessDto } from './vendor-insights.response.dto';

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
  url!: string;
  caption?: string;
  isPrimary!: boolean;
  position!: number;
  createdAt!: Date;
}

export class TruckGalleryResponseDto {
  vendorId!: string;
  isPublic!: boolean;
  total!: number;
  images!: TruckGalleryImageResponseDto[];
}

export class UploadTruckGalleryResponseDto {
  message!: string;
}

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

export class VendorStatusResponseDto {
  id!: string;
  status!: VendorLiveStatus;
  isOnline!: boolean;
  label!: string;
  statusUpdatedAt!: Date | null;
}

export class VendorMenuCategoryProductImageDto {
  id!: string;
  url!: string;
  position!: number;
}

export class VendorMenuCategoryProductDto {
  id!: string;
  name!: string;
  description?: string;
  price!: number;
  estimateCookTime!: number;
  isActive!: boolean;
  availabilityLabel!: string;
  image?: string;
  images!: VendorMenuCategoryProductImageDto[];
}

export class VendorMenuCategoriesResponseDto {
  totalCategories!: number;
  totalItems!: number;
  categories!: VendorMenuCategoryDto[];
}

export class VendorMenuItemResponseDto {
  id!: string;
  name!: string;
  description?: string;

  price!: number;
  estimateCookTime!: number;

  image?: string;

  category?: {
    id: string;
    name: string;
  };

  isActive!: boolean;
  availabilityLabel!: string;

  createdAt!: Date;
}

export class VendorMenuItemsResponseDto {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  items!: VendorMenuItemResponseDto[];
}

export class VendorMenuItemStatusResponseDto {
  id!: string;
  name!: string;
  isActive!: boolean;
  availabilityLabel!: string;
}

export class DeleteVendorMenuItemResponseDto {
  id!: string;
  deleted!: boolean;
  deletedAt!: Date | null;
}

export class VendorReviewRatingDistributionDto {
  rating!: number;
  count!: number;
  percent!: number;
}

export class VendorReviewTagDto {
  id!: string;
  name!: string;
}

export class VendorReviewImageDto {
  id!: string;
  imageUrl!: string;
  position!: number;
}

export class VendorReviewCustomerDto {
  id!: string;
  name!: string;
  avatar?: string;
}

export class VendorReviewListItemDto {
  id!: string;
  rating!: number;
  reviewText?: string;

  customer!: VendorReviewCustomerDto;

  tags!: VendorReviewTagDto[];
  images!: VendorReviewImageDto[];

  createdAt!: Date;
  dateLabel!: string;
}

export class VendorReviewsResponseDto {
  summary!: {
    averageRating: number;
    totalReviews: number;
    distribution: VendorReviewRatingDistributionDto[];
  };

  sort!: 'MOST_RECENT' | 'HIGHEST_RATED' | 'LOWEST_RATED';

  pagination!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  reviews!: VendorReviewListItemDto[];
}

export class VendorFollowerCustomerDto {
  id!: string;
  name!: string;
  avatar?: string;
}

export class VendorFollowerListItemDto {
  id!: string;

  customer!: VendorFollowerCustomerDto;

  followedAt!: Date;
  followerSinceLabel!: string;

  orderCount!: number;
  orderLabel!: string;
}

export class VendorFollowersResponseDto {
  access!: VendorInsightAccessDto;

  locked!: boolean;
  lockedMessage?: string;

  summary!: {
    totalFollowers: number;
    thisMonthFollowers: number;
    previousMonthFollowers: number;
    growthPercent: number;
    growthLabel: string;
  };

  pagination!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  followers!: VendorFollowerListItemDto[];
}

export class VendorMenuProductImageDto {
  id!: string;
  url?: string;
  isPrimary!: boolean;
  position!: number;
}

export class VendorMenuProductCuisineDto {
  id!: string;
  name!: string;
  imageUrl?: string;
}

export class VendorMenuCategoryDto {
  id!: string;
  name!: string;
  itemCount!: number;
  products!: VendorMenuProductDto[];
}

export class VendorMenuResponseDto {
  totalCategories!: number;
  totalItems!: number;
  categories!: VendorMenuCategoryDto[];
}

export class VendorMenuHeaderDto {
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

export class VendorMenuProductDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  estimateCookTime!: number;
  image?: string;
  categoryName?: string;
}

export class VendorMenuSectionDto {
  categoryId!: string;
  categoryName!: string;
  products!: VendorMenuProductDto[];
}

export class VendorMenuDetailResponseDto {
  vendor!: VendorMenuHeaderDto;
  sections!: VendorMenuSectionDto[];
}
