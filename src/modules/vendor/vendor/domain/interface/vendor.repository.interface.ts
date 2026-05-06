import { Vendor } from "../entities/vendor.entity";
import { VendorMenuQueryDto } from '../../presentation/dto/vendor.dto';
import { VendorLiveStatus } from '@prisma/client';

export interface VendorStatusView {
  id: string;
  status: VendorLiveStatus;
  statusUpdatedAt: Date | null;
}

export interface UpdateVendorStatusInput {
  ownerId: string;
  status: VendorLiveStatus;
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

  updateVendorStatus(
    data: UpdateVendorStatusInput,
  ): Promise<VendorStatusView>;

  findVendorStatusByOwnerId(
    ownerId: string,
  ): Promise<VendorStatusView | null>;

}