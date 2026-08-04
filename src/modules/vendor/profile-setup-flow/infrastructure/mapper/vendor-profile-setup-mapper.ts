import { Injectable } from '@nestjs/common';
import {
  CuisineResponseDto,
  VendorProfileSetupResponseDto,
  OperationHoursResponseDto,
  OperationHourDetailResponseDto,
  TodayStatusResponseDto,
} from '../../presentation/dto/profile-setup-flow.response.dto';
import {
  VendorProfileSetupView,
  CuisineView,
  OperationHoursResponseView,
  OperationHourDetailView,
  TodayStatusView,
} from '../../domain/interface/profile.setup.interface';

import { MediaService } from '@/common/media/media.service';

@Injectable()
export class VendorProfileSetupMapper {
  constructor(private readonly mediaService: MediaService) {}

  toResponse(vendor: VendorProfileSetupView): VendorProfileSetupResponseDto {
    return {
      id: vendor.id,

      businessName: vendor.businessName,
      publicEmail: vendor.publicEmail,
      contactNumber: vendor.contactNumber,
      bio: vendor.bio,

      coverImage: vendor.coverImage
        ? this.resolveMediaUrl(vendor.coverImage)
        : undefined,

      onboardingStep: vendor.onboardingStep,

      cuisines: vendor.cuisines.map((entry) => ({
        id: entry.cuisine.id,
        name: entry.cuisine.name,
        imageUrl: entry.cuisine.imageUrl
          ? this.resolveMediaUrl(entry.cuisine.imageUrl)
          : undefined,
      })),

      socialLinks: vendor.socialLinks.map((link) => ({
        id: link.id,
        url: link.url,
      })),
    };
  }

  toListResponse(cuisines: CuisineView[]): CuisineResponseDto[] {
    return cuisines.map((cuisine) => this.toCuisineResponse(cuisine));
  }

  toCuisineResponse(cuisine: CuisineView): CuisineResponseDto {
    return {
      id: cuisine.id,
      name: cuisine.name,
      imageUrl: cuisine.imageUrl
        ? this.resolveMediaUrl(cuisine.imageUrl)
        : undefined,
      createdAt: cuisine.createdAt,
      updatedAt: cuisine.updatedAt,
    };
  }

  // ============================================
  // OPERATION HOURS MAPPERS
  // ============================================

  toOperationHoursResponse(
    view: OperationHoursResponseView,
  ): OperationHoursResponseDto {
    return {
      vendorId: view.vendorId,
      activePeriodStart: view.activePeriodStart,
      activePeriodEnd: view.activePeriodEnd,
      hours: view.hours.map((h) => this.toOperationHourDetail(h)),
      todayStatus: this.toTodayStatus(view.todayStatus),
    };
  }

  private toOperationHourDetail(
    view: OperationHourDetailView,
  ): OperationHourDetailResponseDto {
    return {
      id: view.id,
      dayOfWeek: view.dayOfWeek,
      openTime: view.openTime,
      closeTime: view.closeTime,
      isClosed: view.isClosed,
      priority: view.priority,
      activeFrom: view.activeFrom,
      activeTo: view.activeTo,
      leavingSoonEnabled: view.leavingSoonEnabled,
      leavingSoonMinutes: view.leavingSoonMinutes,
      customLeavingTime: view.customLeavingTime,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
    };
  }

  private toTodayStatus(view: TodayStatusView): TodayStatusResponseDto {
    return {
      isOpen: view.isOpen,
      openTime: view.openTime,
      closeTime: view.closeTime,
      leavingSoonEnabled: view.leavingSoonEnabled,
      leavingSoonMinutes: view.leavingSoonMinutes,
      customLeavingTime: view.customLeavingTime,
      timeUntilClose: view.timeUntilClose,
      timeUntilLeavingSoon: view.timeUntilLeavingSoon,
    };
  }

  private resolveMediaUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }
}
