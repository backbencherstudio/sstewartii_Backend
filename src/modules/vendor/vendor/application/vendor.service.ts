import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import {
  VendorLiveStatus,
  VerificationStatus,
  KycStatus,
} from '@prisma/client';

import type { IVendorRepository } from '../domain/interface/vendor.repository.interface';

import { VendorMapper } from '../infrastructure/mapper/vendor.mapper';
import { VendorInsightsMapper } from '../infrastructure/mapper/vendor-insights.mapper';

import {
  VendorMenuQueryDto,
  UploadTruckGalleryDto,
  UpdateVendorStatusDto,
  VendorMenuItemsQueryDto,
  UpdateVendorMenuItemStatusDto,
  VendorReviewsQueryDtoMe,
  VendorFollowersQueryDto,
  DeleteTruckGalleryImagesDto,
  UpdateTruckGalleryImageDto,
} from '../presentation/dto/vendor.dto';
import {
  VendorInsightsOverviewQueryDto,
  VendorAiGuidanceQueryDto,
} from '../presentation/dto/vendor-insights.query.dto';

import {
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
  VendorFollowersResponseDto,
  VendorMenuDetailResponseDto,
  DeleteTruckGalleryImagesResponseDto,
  UpdateTruckGalleryImageResponseDto,
} from '../presentation/dto/vendor.response.dto';
import {
  VendorInsightsOverviewResponseDto,
  VendorAiGuidanceResponseDto,
} from '../presentation/dto/vendor-insights.response.dto';

import { LocalStorageService } from '@/common/storage/local.storage.service';
import { VendorInsightAccessService } from './vendor-insight-access.service';
import { MediaService } from '@/common/media/media.service';

@Injectable()
export class VendorService {
  constructor(
    @Inject('IVendorRepository')
    private readonly vendorRepository: IVendorRepository,
    private readonly storageService: LocalStorageService,
    private readonly vendorMapper: VendorMapper,
    private readonly vendorInsightsMapper: VendorInsightsMapper,
    private readonly vendorInsightAccessService: VendorInsightAccessService,
    private readonly mediaService: MediaService,
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
    userId?: string,
    customerLocation?: { latitude: number; longitude: number },
  ): Promise<VendorMenuDetailResponseDto> {
    const vendor = await this.vendorRepository.findVendorMenuById(
      vendorId,
      query,
    );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    await this.trackVendorProfileViewSafely(vendorId, userId);

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
        !item.isClosed && item.openTime !== null && item.openTime > currentTime,
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

  async getVendorInfo(vendorId: string): Promise<VendorInfoResponseDto> {
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

    // If setting primary, reset all existing primary flags
    if (dto.isPrimary) {
      await this.vendorRepository.resetTruckGalleryPrimary(vendor.id);
    }

    const folder = `vendor/truck-gallery/${vendor.id}`;

    // Upload all files
    const uploadPromises = files.map((file) =>
      this.storageService.uploadFile(file, folder),
    );
    const uploadedUrls = await Promise.all(uploadPromises);

    console.log('📁 Uploaded URLs from storage:', uploadedUrls);

    // Create gallery image records
    const images = uploadedUrls.map((url, index) => ({
      url,
      caption: dto.caption,
      isPrimary: dto.isPrimary ?? (index === 0 && files.length === 1),
      position: (dto.position ?? 0) + index,
    }));

    // ✅ Create the images and get the created records
    await this.vendorRepository.createTruckGalleryImages({
      vendorId: vendor.id,
      images,
    });

    // ✅ Fetch the newly created images by getting the latest based on creation
    const gallery =
      await this.vendorRepository.findTruckGalleryByOwnerId(userId);

    // ✅ Sort by createdAt descending and take the last N
    const sortedImages =
      gallery?.truckGalleryImages?.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ) ?? [];

    const latestImages = sortedImages.slice(0, files.length);

    console.log('🖼️ Latest images from DB:', latestImages);

    // Process images for response
    const processedImages = latestImages.map((img) => {
      const url = this.mediaService.getUrl(img.url);
      console.log('🔍 URL transformation:', {
        original: img.url,
        transformed: url,
      });
      return {
        id: img.id,
        url: url ?? '',
        caption: img.caption ?? undefined,
        isPrimary: img.isPrimary,
        position: img.position,
      };
    });

    return {
      uploaded: files.length,
      images: processedImages,
    };
  }

  async deleteTruckGalleryImages(
    userId: string,
    dto: DeleteTruckGalleryImagesDto,
  ): Promise<DeleteTruckGalleryImagesResponseDto> {
    const vendor = await this.vendorRepository.findByOwnerId(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Verify all images belong to this vendor
    const imageIds = dto.imageIds;
    const images = await Promise.all(
      imageIds.map((id) => this.vendorRepository.findTruckGalleryImageById(id)),
    );

    const invalidImages = images.filter(
      (img) => !img || img.vendorId !== vendor.id,
    );

    if (invalidImages.length > 0) {
      throw new ForbiddenException(
        `You don't have permission to delete ${invalidImages.length} of the requested images`,
      );
    }

    // ✅ Delete physical files from disk
    const validImages = images.filter(
      (img): img is NonNullable<typeof img> => img !== null,
    );
    for (const image of validImages) {
      try {
        await this.storageService.deleteFile(image.url);
        console.log(`✅ Deleted file from disk: ${image.url}`);
      } catch (error) {
        console.error(
          `❌ Failed to delete file from disk: ${image.url}`,
          error,
        );
        // Continue with other deletions even if one fails
      }
    }

    // Delete the images from database
    const result =
      await this.vendorRepository.deleteTruckGalleryImages(imageIds);

    // If a primary image was deleted, set a new primary
    const deletedPrimary = images.some((img) => img?.isPrimary);
    if (deletedPrimary) {
      const remainingGallery =
        await this.vendorRepository.findTruckGalleryByOwnerId(userId);
      const remainingImages = remainingGallery?.truckGalleryImages ?? [];

      if (remainingImages.length > 0) {
        // Set the first remaining image as primary
        await this.vendorRepository.updateTruckGalleryImage({
          id: remainingImages[0].id,
          isPrimary: true,
        });
      }
    }

    return {
      message: `Successfully deleted ${result.count} image(s).`,
      deletedCount: result.count,
      deletedIds: imageIds,
    };
  }

  async deleteTruckGalleryImage(
    userId: string,
    imageId: string,
  ): Promise<DeleteTruckGalleryImagesResponseDto> {
    const vendor = await this.vendorRepository.findByOwnerId(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const image =
      await this.vendorRepository.findTruckGalleryImageById(imageId);

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.vendorId !== vendor.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this image',
      );
    }

    // ✅ Delete physical file from disk
    try {
      await this.storageService.deleteFile(image.url);
      console.log(`✅ Deleted file from disk: ${image.url}`);
    } catch (error) {
      console.error(`❌ Failed to delete file from disk: ${image.url}`, error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the image from database
    const result = await this.vendorRepository.deleteTruckGalleryImages([
      imageId,
    ]);

    // If a primary image was deleted, set a new primary
    if (image.isPrimary) {
      const remainingGallery =
        await this.vendorRepository.findTruckGalleryByOwnerId(userId);
      const remainingImages = remainingGallery?.truckGalleryImages ?? [];

      if (remainingImages.length > 0) {
        await this.vendorRepository.updateTruckGalleryImage({
          id: remainingImages[0].id,
          isPrimary: true,
        });
      }
    }

    return {
      message: 'Successfully deleted image.',
      deletedCount: result.count,
      deletedIds: [imageId],
    };
  }

  async updateTruckGalleryImage(
    userId: string,
    imageId: string,
    dto: UpdateTruckGalleryImageDto,
  ): Promise<UpdateTruckGalleryImageResponseDto> {
    const vendor = await this.vendorRepository.findByOwnerId(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const image =
      await this.vendorRepository.findTruckGalleryImageById(imageId);

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.vendorId !== vendor.id) {
      throw new ForbiddenException(
        'You do not have permission to update this image',
      );
    }

    // If setting as primary, reset all existing primary flags
    if (dto.isPrimary) {
      await this.vendorRepository.resetTruckGalleryPrimary(vendor.id);
    }

    const updatedImage = await this.vendorRepository.updateTruckGalleryImage({
      id: imageId,
      caption: dto.caption,
      isPrimary: dto.isPrimary,
      position: dto.position,
    });

    const url = this.mediaService.getUrl(updatedImage.url);

    return {
      message: 'Image updated successfully.',
      image: {
        id: updatedImage.id,
        url: url ?? '',
        caption: updatedImage.caption ?? undefined,
        isPrimary: updatedImage.isPrimary,
        position: updatedImage.position,
        updatedAt: new Date(),
      },
    };
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
    const vendor =
      await this.vendorRepository.findGoLiveEligibilityByOwnerId(ownerId);

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
    const vendor =
      await this.vendorRepository.findVendorMenuCategories(ownerId);

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

    const product =
      await this.vendorRepository.findVendorMenuItemOwner(productId);

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

    const product =
      await this.vendorRepository.findVendorMenuItemOwner(productId);

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

    const deletedProduct = await this.vendorRepository.softDeleteVendorMenuItem(
      product.id,
    );

    return this.vendorMapper.toDeleteVendorMenuItemResponse(deletedProduct);
  }

  async getMyTruckGallery(ownerId: string): Promise<TruckGalleryResponseDto> {
    const vendor =
      await this.vendorRepository.findTruckGalleryByOwnerId(ownerId);

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
      await this.vendorRepository.findVendorInsightProfileByOwnerId(ownerId);

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

  private resolveInsightDateRange(query: VendorInsightsOverviewQueryDto): {
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
      const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

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
    const vendor = await this.vendorRepository.findAiProfileByOwnerId(ownerId);

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
    const vendor = await this.vendorRepository.findVendorIdByOwnerId(ownerId);

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

  async getVendorFollowers(
    ownerId: string,
    query: VendorFollowersQueryDto,
  ): Promise<VendorFollowersResponseDto> {
    const vendor =
      await this.vendorRepository.findFollowersProfileByOwnerId(ownerId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const access = this.vendorInsightAccessService.resolveAccess(vendor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (!access.canViewFavorites) {
      return this.vendorMapper.toLockedResponse({
        access,
        page,
        limit,
        message:
          'Upgrade to Pro to unlock followers and customer engagement insights.',
      });
    }

    const now = new Date();

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const previousMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const [totalFollowers, thisMonthFollowers, previousMonthFollowers, result] =
      await Promise.all([
        this.vendorRepository.countVendorFollowers(vendor.id),

        this.vendorRepository.countVendorFollowersInRange({
          vendorId: vendor.id,
          startDate: currentMonthStart,
          endDate: currentMonthEnd,
        }),

        this.vendorRepository.countVendorFollowersInRange({
          vendorId: vendor.id,
          startDate: previousMonthStart,
          endDate: previousMonthEnd,
        }),

        this.vendorRepository.findVendorFollowers({
          vendorId: vendor.id,
          page,
          limit,
        }),
      ]);

    return this.vendorMapper.toFollowerResponse({
      access,
      totalFollowers,
      thisMonthFollowers,
      previousMonthFollowers,
      total: result.total,
      page,
      limit,
      followers: result.followers,
    });
  }

  private async trackVendorProfileViewSafely(
    vendorId: string,
    userId?: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      const customerId =
        await this.vendorRepository.findCustomerIdByUserId(userId);

      if (!customerId) {
        return;
      }

      await this.vendorRepository.createVendorProfileViewOncePerDay({
        vendorId,
        customerId,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Silently fail - don't throw error for tracking
    }
  }
}
