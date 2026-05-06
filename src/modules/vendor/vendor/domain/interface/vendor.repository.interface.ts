import { 
  VendorLiveStatus,
  VerificationStatus,
  KycStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { Vendor } from "../entities/vendor.entity";
import {
   VendorMenuQueryDto,
   VendorMenuItemsQueryDto,
  } from '../../presentation/dto/vendor.dto';

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
}

export interface VendorMenuItemStatusView {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: Date;
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

  // findTruckGalleryByVendorId(vendorId: string): Promise<{
  //   id: string;
  //   truckGalleryImages: {
  //     id: string;
  //     url: string;
  //     caption: string | null;
  //     isPrimary: boolean;
  //     position: number;
  //     createdAt: Date;
  //   }[];
  // } | null>;

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
  
}