import { Injectable } from '@nestjs/common';
import { MediaService } from '@/common/media/media.service';
import { VendorProfileSetupResponseDto } from '../../presentation/dto/profile-setup-flow.response.dto';


@Injectable()
export class VendorProfileSetupMapper {
  constructor(private readonly mediaService: MediaService) {}

  toResponse(
    vendor: VendorProfileSetupView,
  ): VendorProfileSetupResponseDto {
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

  private resolveMediaUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }
}