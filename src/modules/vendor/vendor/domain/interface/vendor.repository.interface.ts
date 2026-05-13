import { 
  VendorLiveStatus,
  VerificationStatus,
  KycStatus,
  SubscriptionStatus,
  OrderStatus,
} from '@prisma/client';

import { Vendor } from "../entities/vendor.entity";
import {
   VendorMenuQueryDto,
   VendorMenuItemsQueryDto,
  } from '../../presentation/dto/vendor.dto';

import { VendorInsightsOverviewQueryDto } from '../../presentation/dto/vendor-insights.query.dto';

export interface VendorStatusView {
  id: string;
  status: VendorLiveStatus;
  statusUpdatedAt: Date | null;
}

export interface UpdateVendorStatusInput {
  ownerId: string;
  status: VendorLiveStatus;
}

export interface VendorGoLiveEligibilityView {
  id: string;
  kycStatus: KycStatus;
  vendorVerification: {
    id: string;
    status: VerificationStatus;
  } | null;
}

export interface VendorMenuItemsResult {
  total: number;
  items: any[];
}

export interface VendorMenuItemOwnerView {
  id: string;
  vendorId: string;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
}

export interface VendorMenuItemStatusView {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DeleteVendorMenuItemView {
  id: string;
  isDeleted: boolean;
  deletedAt: Date | null;
}

export interface TruckGalleryImageView {
  id: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
  position: number;
  createdAt: Date;
}

export interface VendorTruckGalleryView {
  id: string;
  truckGalleryImages: TruckGalleryImageView[];
}

export interface VendorInsightsDateRange {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

export interface VendorRevenueOrderRow {
  createdAt: Date;
  totalAmount: number;
}

export interface VendorPeakHoursOrderRow {
  createdAt: Date;
  totalAmount: number;
}

export interface VendorInsightProfileView {
  id: string;
  truckReviewAverage: number;
  truckReviewCount: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: Date | null;
  subscriptionPlan: {
    id: string;
    name: string;
  } | null;
}

export interface VendorInsightOrderItemView {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  lineTotal: number;
}

export interface VendorInsightOrderView {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  customer: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  };
  orderItems: VendorInsightOrderItemView[];
}

export interface VendorFavoriteCountView {
  total: number;
}

export interface VendorInsightsDateRangeInput {
  vendorId: string;
  startDate: Date;
  endDate: Date;
}


export interface IVendorRepository {

  findByVendorId(ownerId: string): Promise<Vendor | null>;
  findByOwnerId(ownerId: string): Promise<Vendor | null>;

  findById(id: string): Promise<Vendor | null>;
  
  findVendorMenuById(
    vendorId: string,
    query: VendorMenuQueryDto,
  ): Promise<any | null>;

  findVendorInfoById(vendorId: string): Promise<any | null>;

  resetTruckGalleryPrimary(vendorId: string): Promise<void>;

  createTruckGalleryImages(data: {
    vendorId: string;
    images: {
      url: string;
      caption?: string;
      isPrimary?: boolean;
      position?: number;
    }[];
  }): Promise<void>;

  findVendorHomeByOwnerId(ownerId: string): Promise<any | null>;

  getVendorTodayStats(data: {
    vendorId: string;
    startOfDay: Date;
    endOfDay: Date;
  }): Promise<{
    todaySale: number;
    ordersCompleted: number;
    pendingOrders: number;
    cancelledOrders: number;
  }>;
  
  findVendorStatusByOwnerId(
    ownerId: string,
  ): Promise<VendorStatusView | null>;

  updateVendorStatus(
    data: UpdateVendorStatusInput,
  ): Promise<VendorStatusView>;

  findGoLiveEligibilityByOwnerId(
    ownerId: string,
  ): Promise<VendorGoLiveEligibilityView | null>;

  findVendorMenuCategories(ownerId: string): Promise<any | null>;

  findVendorMenuItems(
    ownerId: string,
    query: VendorMenuItemsQueryDto,
  ): Promise<VendorMenuItemsResult>;

  findVendorIdByOwnerId(ownerId: string): Promise<{ id: string } | null>;

  findVendorMenuItemOwner(productId: string): Promise<VendorMenuItemOwnerView | null>;

  updateVendorMenuItemStatus(data: {
    productId: string;
    isActive: boolean;
  }): Promise<VendorMenuItemStatusView>;
  
  softDeleteVendorMenuItem(
    productId: string,
  ): Promise<DeleteVendorMenuItemView>;

  findTruckGalleryByOwnerId(
    ownerId: string,
  ): Promise<VendorTruckGalleryView | null>;

  findVendorInsightProfileByOwnerId(
    ownerId: string,
  ): Promise<VendorInsightProfileView | null>;

  findOrdersForInsights(
    data: VendorInsightsDateRangeInput,
  ): Promise<VendorInsightOrderView[]>;

  countVendorFavorites(vendorId: string): Promise<VendorFavoriteCountView>;

  countVendorFavoritesInRange(
    data: VendorInsightsDateRangeInput,
  ): Promise<VendorFavoriteCountView>;
}