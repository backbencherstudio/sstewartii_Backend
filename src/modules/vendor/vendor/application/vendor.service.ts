import { 
  Injectable,
  NotFoundException, 
  Inject, 
  BadRequestException
} from '@nestjs/common';

import type { IVendorRepository } from '../domain/interface/vendor.repository.interface';
import { VendorMapper } from '../infrastructure/mapper/vendor.mapper';

import { 
  VendorMenuQueryDto,
  UploadTruckGalleryDto,
 } from '../presentation/dto/vendor.dto';

import { 
  VendorMenuResponseDto,
  UploadTruckGalleryResponseDto,
  VendorInfoResponseDto,
  TruckGalleryResponseDto,
 } from '../presentation/dto/vendor.response.dto';

import { LocalStorageService } from '@/common/storage/local.storage.service';

@Injectable()
export class VendorService {

  constructor(
    @Inject('IVendorRepository') 
    private readonly vendorRepository: IVendorRepository,
    private readonly storageService: LocalStorageService,
    private readonly vendorMapper: VendorMapper,
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

  // async getVendorInfo(
  //   vendorId: string,
  // ): Promise<VendorInfoResponseDto> {
  //   const vendor = await this.vendorRepository.findVendorInfoById(vendorId);

  //   if (!vendor) {
  //     throw new NotFoundException('Vendor not found');
  //   }

  //   return VendorMapper.toInfoResponse(vendor);
  // }

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
}