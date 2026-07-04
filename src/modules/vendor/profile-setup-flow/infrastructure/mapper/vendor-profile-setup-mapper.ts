import { Injectable } from '@nestjs/common';
import {
  CuisineResponseDto,
  VendorProfileSetupResponseDto,
} from '../../presentation/dto/profile-setup-flow.response.dto';
import {
  VendorProfileSetupView,
  CuisineView,
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

  private resolveMediaUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }
}
