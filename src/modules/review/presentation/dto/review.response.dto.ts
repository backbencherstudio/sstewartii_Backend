export class ReviewImageResponseDto {
  id!: string;
  imageUrl!: string;
  position!: number;
}

export class ReviewTagResponseDto {
  id!: string;
  name!: string;
}

export class CreateReviewResponseDto {
  id!: string;
  vendorId!: string;
  customerId!: string;
  orderId!: string;
  rating!: number;
  reviewText?: string;
  createdAt!: Date;
  images!: ReviewImageResponseDto[];
  tags!: ReviewTagResponseDto[];
}