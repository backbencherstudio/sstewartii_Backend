import { Vendor } from "../entities/vendor.entity";
import { VendorMenuQueryDto } from '../../presentation/dto/vendor.dto';

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

  findTruckGalleryByVendorId(vendorId: string): Promise<{
    id: string;
    truckGalleryImages: {
      id: string;
      url: string;
      caption: string | null;
      isPrimary: boolean;
      position: number;
      createdAt: Date;
    }[];
  } | null>;

  findVendorReviewSummaryById(vendorId: string): Promise<{
    id: string;
    reviewAverage: number;
    reviewCount: number;
  } | null>;

  findVendorReviewsByVendorId(
    vendorId: string,
  ): Promise<any[]>;
}