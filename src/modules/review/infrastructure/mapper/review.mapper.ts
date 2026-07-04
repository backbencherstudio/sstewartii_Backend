import { Injectable } from '@nestjs/common';

import {
  CreateVendorTruckReviewResponseDto,
  VendorTruckReviewTagListResponseDto,
  VendorTruckReviewsResponseDto,
  CreateFoodReviewResponseDto,
} from '../../presentation/dto/review.response.dto';

import { MediaService } from '@/common/media/media.service';

@Injectable()
export class VendorTruckReviewMapper {
  constructor(private readonly mediaService: MediaService) {}

  toCreateResponse(review: any): CreateVendorTruckReviewResponseDto {
    return {
      id: review.id,
      vendorId: review.vendorId,
      customerId: review.customerId,
      rating: review.rating,
      reviewText: review.reviewText ?? undefined,
      images: review.images.map((image: any) => ({
        id: image.id,
        imageUrl: this.mediaService.getUrl(image.imageUrl),
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

  toTruckReviewListResponse(data: {
    vendorId: string;
    reviewAverage: number;
    reviewCount: number;
    reviews: any[];
    page: number;
    limit: number;
    total: number;
  }): VendorTruckReviewsResponseDto {
    return {
      vendorId: data.vendorId,
      reviewAverage: Number((data.reviewAverage ?? 0).toFixed(1)),
      reviewCount: data.reviewCount ?? 0,
      items: data.reviews.map((review) => ({
        id: review.id,
        customer: {
          id: review.customer.id,
          name:
            review.customer.user?.name ??
            review.customer.user?.email ??
            'Customer',
          avatar: review.customer.avatar ?? undefined,
        },
        rating: review.rating,
        reviewText: review.reviewText ?? undefined,
        images: (review.images ?? []).map((image: any) => ({
          id: image.id,
          imageUrl: this.mediaService.getUrl(image.imageUrl),
          position: image.position,
        })),
        tags: (review.tags ?? []).map((entry: any) => ({
          id: entry.tag.id,
          name: entry.tag.name,
        })),
        createdAt: review.createdAt,
      })),
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.total === 0 ? 0 : Math.ceil(data.total / data.limit),
    };
  }

  toCreateFoodResponse(review: any): CreateFoodReviewResponseDto {
    return {
      id: review.id,
      productId: review.productId,
      customerId: review.customerId,
      orderItemId: review.orderItemId,
      rating: review.rating,
      reviewText: review.reviewText ?? undefined,
      images: review.images.map((image: any) => ({
        id: image.id,
        imageUrl: this.mediaService.getUrl(image.imageUrl),
        position: image.position,
      })),
      tags: review.tags.map((entry: any) => ({
        id: entry.tag.id,
        name: entry.tag.name,
      })),
      createdAt: review.createdAt,
    };
  }
}
