import { 
  Injectable,
  NotFoundException, 
  Inject, 
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';

import { 
  VendorLiveStatus,
  VerificationStatus,
  KycStatus,
} from '@prisma/client';

import type { 
  IVendorRepository, 
  VendorInsightsDateRange,
} from '../domain/interface/vendor.repository.interface';

import { VendorMapper } from '../infrastructure/mapper/vendor.mapper';
import { VendorInsightsMapper } from '../infrastructure/mapper/vendor-insights.mapper';

import { 
  VendorMenuQueryDto,
  UploadTruckGalleryDto,
  UpdateVendorStatusDto,
  VendorMenuItemsQueryDto,
  UpdateVendorMenuItemStatusDto,
  VendorReviewsQueryDtoMe,
 } from '../presentation/dto/vendor.dto';
import { 
  VendorInsightsOverviewQueryDto,
  VendorAiGuidanceQueryDto,
 } from '../presentation/dto/vendor-insights.query.dto';

import { 
  VendorMenuResponseDto,
  UploadTruckGalleryResponseDto,
  VendorInfoResponseDto,
  TruckGalleryResponseDto,
  VendorHomeResponseDto,
  VendorStatusResponseDto,
  VendorMenuCategoriesResponseDto,
  VendorMenuItemsResponseDto,
  VendorMenuItemStatusResponseDto,
  DeleteVendorMenuItemResponseDto,
  VendorReviewsResponseDto,
 } from '../presentation/dto/vendor.response.dto';
 import { 
  VendorInsightsOverviewResponseDto,
  VendorAiGuidanceResponseDto,
 } from '../presentation/dto/vendor-insights.response.dto';

import { LocalStorageService } from '@/common/storage/local.storage.service';
import { VendorInsightAccessService } from './vendor-insight-access.service';


@Injectable()
export class VendorService {

  constructor(
    @Inject('IVendorRepository') 
    private readonly vendorRepository: IVendorRepository,
    private readonly storageService: LocalStorageService,
    private readonly vendorMapper: VendorMapper,
    private readonly vendorInsightsMapper: VendorInsightsMapper,
    private readonly vendorInsightAccessService: VendorInsightAccessService,
  ) {}

  async findByVendorId(vendorId: string) {
    const vendor = await this.vendorRepository.findByVendorId(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async execute(ownerId: string) {
    const vendor = await this.vendorRepository.findByOwnerId(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async getVendorMenu(
    vendorId: string,
    query: VendorMenuQueryDto,
    customerLocation?: { latitude: number; longitude: number },
  ): Promise<VendorMenuResponseDto> {
    const vendor = await this.vendorRepository.findVendorMenuById(vendorId, query);

    if (!vendor) {  
      throw new NotFoundException('Vendor not found');
    }

    let distanceKm: number | undefined;

    if (
      customerLocation &&
      vendor.serviceArea?.latitude !== null &&
      vendor.serviceArea?.latitude !== undefined &&
      vendor.serviceArea?.longitude !== null &&
      vendor.serviceArea?.longitude !== undefined
    ) {
      distanceKm = this.calculateDistanceKm(
        customerLocation.latitude,
        customerLocation.longitude,
        vendor.serviceArea.latitude,
        vendor.serviceArea.longitude,
      );
    }

    const availability = this.resolveAvailability(vendor.operationHours ?? []);

    return this.vendorMapper.toMenuResponse(vendor, {
      distanceKm,
      isOpen: availability.isOpen,
      statusLabel: availability.label,
      cityLabel: this.extractCityLabel(vendor.serviceArea?.address),
    });
  }

  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number): number => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private resolveAvailability(
    operationHours: Array<{
      dayOfWeek: number;
      openTime: string | null;
      closeTime: string | null;
      isClosed: boolean;
      activeFrom: Date;
      activeTo: Date | null;
    }>,
  ): { isOpen: boolean; label: string } {
    const now = new Date();
    const today = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const todaysHours = operationHours
      .filter(
        (item) =>
          item.dayOfWeek === today &&
          item.activeFrom <= now &&
          (!item.activeTo || item.activeTo >= now),
      )
      .sort((a, b) => (a.openTime ?? '').localeCompare(b.openTime ?? ''));

    if (!todaysHours.length) {
      return {
        isOpen: false,
        label: 'Temporarily Closed',
      };
    }

    const currentSlot = todaysHours.find((item) => {
      if (item.isClosed || !item.openTime || !item.closeTime) {
        return false;
      }

      return currentTime >= item.openTime && currentTime <= item.closeTime;
    });

    if (currentSlot) {
      return {
        isOpen: true,
        label: 'Open Now',
      };
    }

    const nextSlot = todaysHours.find(
      (item) =>
        !item.isClosed &&
        item.openTime !== null &&
        item.openTime > currentTime,
    );

    if (nextSlot?.openTime) {
      return {
        isOpen: false,
        label: `Opens at ${this.formatTime(nextSlot.openTime)}`,
      };
    }

    return {
      isOpen: false,
      label: 'Temporarily Closed',
    };
  }

  private formatTime(time: string): string {
    const [hourStr, minute] = time.split(':');
    const hour = Number(hourStr);

    const suffix = hour >= 12 ? 'pm' : 'am';
    const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${normalizedHour}:${minute}${suffix}`;
  }

  private extractCityLabel(address?: string | null): string | undefined {
    if (!address) {
      return undefined;
    }

    return address.split(',')[0]?.trim() || undefined;
  }

  async getVendorInfo(
    vendorId: string,
  ): Promise<VendorInfoResponseDto> {
    const vendor = await this.vendorRepository.findVendorInfoById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return VendorMapper.toInfoResponse(vendor);
  }

  async uploadTruckGalleryImages(
    userId: string,
    dto: UploadTruckGalleryDto,
    files: Express.Multer.File[],
  ): Promise<UploadTruckGalleryResponseDto> {
    const vendor = await this.vendorRepository.findByOwnerId(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one gallery image is required');
    }

    if (dto.isPrimary) {
      await this.vendorRepository.resetTruckGalleryPrimary(vendor.id);
    }

    const folder = `vendor/truck-gallery/${vendor.id}`;

    const uploadedUrls = await Promise.all(
      files.map((file) => this.storageService.uploadFile(file, folder)),
    );

    await this.vendorRepository.createTruckGalleryImages({
      vendorId: vendor.id,
      images: uploadedUrls.map((url, index) => ({
        url,
        caption: dto.caption,
        isPrimary: dto.isPrimary ?? false,
        position: dto.position ?? index,
      })),
    });

    return VendorMapper.toUploadTruckGalleryResponse();
  }

  async getVendorHome(ownerId: string): Promise<VendorHomeResponseDto> {
    const vendor = await this.vendorRepository.findVendorHomeByOwnerId(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const { startOfDay, endOfDay } = this.getTodayRange();

    const stats = await this.vendorRepository.getVendorTodayStats({
      vendorId: vendor.id,
      startOfDay,
      endOfDay,
    });

    const isLive = false;

    const unreadNotificationCount = 0;

    return this.vendorMapper.toVendorHomeResponse({
      vendor,
      stats,
      unreadNotificationCount,
      isLive,
    });
  }

  private getTodayRange(): {
    startOfDay: Date;
    endOfDay: Date;
  } {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      startOfDay,
      endOfDay,
    };
  }

  async updateVendorStatus(
    ownerId: string,
    dto: UpdateVendorStatusDto,
  ): Promise<VendorStatusResponseDto> {
    const vendor = await this.vendorRepository.findGoLiveEligibilityByOwnerId(
      ownerId,
    );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (dto.status === VendorLiveStatus.ONLINE) {
      this.validateVendorCanGoLive(vendor);
    }

    const updatedVendor = await this.vendorRepository.updateVendorStatus({
      ownerId,
      status: dto.status,
    });

    return {
      id: updatedVendor.id,
      status: updatedVendor.status,
      isOnline: updatedVendor.status === VendorLiveStatus.ONLINE,
      label: this.getVendorStatusLabel(updatedVendor.status),
      statusUpdatedAt: updatedVendor.statusUpdatedAt,
    };
  }

  private validateVendorCanGoLive(vendor: {
    kycStatus: KycStatus;
    vendorVerification: {
      status: VerificationStatus;
    } | null;
  }): void {
    if (vendor.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException({
        code: 'KYC_NOT_APPROVED',
        message:
          'Verification required. Please complete your identity verification before going online.',
      });
    }

    if (!vendor.vendorVerification) {
      throw new BadRequestException({
        code: 'BUSINESS_VERIFICATION_REQUIRED',
        message:
          'Verification required. Please complete your business profile verification before going online.',
      });
    }

    if (vendor.vendorVerification.status !== VerificationStatus.APPROVED) {
      throw new BadRequestException({
        code: 'BUSINESS_VERIFICATION_NOT_APPROVED',
        status: vendor.vendorVerification.status,
        message:
          'Verification required. Your business verification must be approved before going online.',
      });
    }
  }

  private getVendorStatusLabel(status: VendorLiveStatus): string {
    switch (status) {
      case VendorLiveStatus.ONLINE:
        return 'Online';

      case VendorLiveStatus.TEMPORARILY_CLOSED:
        return 'Temporarily Closed';

      case VendorLiveStatus.OFFLINE:
      default:
        return 'Offline';
    }
  }

  async getVendorMenuCategories(
    ownerId: string,
  ): Promise<VendorMenuCategoriesResponseDto> {
    const vendor = await this.vendorRepository.findVendorMenuCategories(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.vendorMapper.toMenuCategoriesResponse(vendor);
  }

  async getVendorMenuItems(
    ownerId: string,
    query: VendorMenuItemsQueryDto,
  ): Promise<VendorMenuItemsResponseDto> {
    const result = await this.vendorRepository.findVendorMenuItems(
      ownerId,
      query,
    );

    return this.vendorMapper.toMenuItemsResponse({
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      items: result.items,  
    });
  }

  async updateVendorMenuItemStatus(
    ownerId: string,
    productId: string,
    dto: UpdateVendorMenuItemStatusDto,
  ): Promise<VendorMenuItemStatusResponseDto> {
    const vendor = await this.vendorRepository.findVendorIdByOwnerId(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const product = await this.vendorRepository.findVendorMenuItemOwner(productId);

    if (!product) {
      throw new NotFoundException('Menu item not found');
    }

    if (product.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot update this menu item');
    }

    if (product.isActive === dto.isActive) {
      return this.vendorMapper.toMenuItemStatusResponse({
        ...product,
        updatedAt: new Date(),
      });
    }

    const updatedProduct =
      await this.vendorRepository.updateVendorMenuItemStatus({
        productId: product.id,
        isActive: dto.isActive,
      });

    return this.vendorMapper.toMenuItemStatusResponse(updatedProduct);
  }

  async deleteVendorMenuItem(
    ownerId: string,
    productId: string,
  ): Promise<DeleteVendorMenuItemResponseDto> {
    const vendor = await this.vendorRepository.findVendorIdByOwnerId(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const product = await this.vendorRepository.findVendorMenuItemOwner(productId);

    if (!product) {
      throw new NotFoundException('Menu item not found');
    }

    if (product.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot delete this menu item');
    }

    if (product.isDeleted) {
      return {
        id: product.id,
        deleted: true,
        deletedAt: null,
      };
    }

    const deletedProduct =
      await this.vendorRepository.softDeleteVendorMenuItem(product.id);

    return this.vendorMapper.toDeleteVendorMenuItemResponse(deletedProduct);
  }

  async getMyTruckGallery(
    ownerId: string,
  ): Promise<TruckGalleryResponseDto> {
    const vendor = await this.vendorRepository.findTruckGalleryByOwnerId(
      ownerId,
    );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.vendorMapper.toResponse(vendor);
  }

  async getVendorInsightsOverview(
    ownerId: string,
    query: VendorInsightsOverviewQueryDto,
  ): Promise<VendorInsightsOverviewResponseDto> {
    const vendor =
      await this.vendorRepository.findVendorInsightProfileByOwnerId(
        ownerId,
      );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const access = this.vendorInsightAccessService.resolveAccess(vendor);

    const dateRange = this.resolveInsightDateRange(query);

    const orders = await this.vendorRepository.findOrdersForInsights({
      vendorId: vendor.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const [totalFavorites, favoritesInRange] = await Promise.all([
      this.vendorRepository.countVendorFavorites(vendor.id),
      this.vendorRepository.countVendorFavoritesInRange({
        vendorId: vendor.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    ]);

    return this.vendorInsightsMapper.toOverviewResponse({
      access,
      range: query.range ?? 'month',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      vendor,
      orders,
      totalFavorites: totalFavorites.total,
      favoritesInRange: favoritesInRange.total,
    });
  }

  private resolveInsightDateRange(
    query: VendorInsightsOverviewQueryDto,
  ): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const range = query.range ?? 'month';

    if (range === 'today') {
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
    }

    if (range === 'week') {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        endDate: now,
      };
    }

    if (range === 'year') {
      const startDate = new Date(now.getFullYear(), 0, 1);
      const endDate = new Date(
        now.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999,
      );

      return { startDate, endDate };
    }

    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return { startDate, endDate };
  }

  async getVendorAiGuidance(
    ownerId: string,
    query: VendorAiGuidanceQueryDto,
  ): Promise<VendorAiGuidanceResponseDto> {
    const vendor = await this.vendorRepository.findAiProfileByOwnerId(
      ownerId,
    );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const access = this.vendorInsightAccessService.resolveAccess(vendor);

    const dateRange = this.resolveInsightDateRange({
      range: query.range ?? 'month',
    });

    const orders = await this.vendorRepository.findOrdersForAiGuidance({
      vendorId: vendor.id,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    return this.vendorInsightsMapper.toAiResponse({
      access,
      range: query.range ?? 'month',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      vendor,
      orders,
    });
  }

  async getVendorRatingsAndReviews(
    ownerId: string,
    query: VendorReviewsQueryDtoMe,
  ): Promise<VendorReviewsResponseDto> {
    const vendor = await this.vendorRepository.findVendorIdByOwnerId(
      ownerId,
    );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const [summary, result] = await Promise.all([
      this.vendorRepository.getVendorReviewSummary(vendor.id),
      this.vendorRepository.findVendorReviews(vendor.id, query),
    ]);

    return this.vendorMapper.toRviewResponse({
      summary,
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sort: query.sort ?? 'MOST_RECENT',
      reviews: result.reviews,
    });
  }
}