import { CreateReviewResponseDto } from '../../presentation/dto/review.response.dto';

export class ReviewMapper {
  static toCreateResponse(review: any): CreateReviewResponseDto {
    return {
      id: review.id,
      vendorId: review.vendorId,
      customerId: review.customerId,
      orderId: review.orderId,
      rating: review.rating,
      reviewText: review.reviewText ?? undefined,
      createdAt: review.createdAt,
      images: review.images.map((image: any) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        position: image.position,
      })),
      tags: review.tags.map((entry: any) => ({
        id: entry.tag.id,
        name: entry.tag.name,
      })),
    };
  }
}