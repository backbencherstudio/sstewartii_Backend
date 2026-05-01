import { Injectable } from '@nestjs/common';

import { 
  CreateVendorTruckReviewResponseDto,
  VendorTruckReviewTagListResponseDto,
 } from '../../presentation/dto/review.response.dto';

import { MediaService } from '@/common/media/media.service';

@Injectable()
export class VendorTruckReviewMapper {
constructor(private readonly mediaService:MediaService){}

  toCreateResponse(review: any): CreateVendorTruckReviewResponseDto {
    return {
      id: review.id,
      vendorId: review.vendorId,
      customerId: review.customerId,
      rating: review.rating,
      reviewText: review.reviewText ?? undefined,
      images: review.images.map((image: any) => ({
        id: image.id,
        imageUrl: this.mediaService.getUrl(image.imageUrl) ,
        position: image.position,
      })),
      tags: review.tags.map((entry: any) => ({
        id: entry.tag.id,
        name: entry.tag.name,
      })),
      createdAt: review.createdAt,
    };
  }

  toTagListResponse(
    tags: {
      id: string;
      name: string;
    }[],
  ): VendorTruckReviewTagListResponseDto {
    return {
      items: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    };
  }

}