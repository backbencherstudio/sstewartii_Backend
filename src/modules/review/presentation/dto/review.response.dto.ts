export class VendorTruckReviewListTagResponseDto {
  id!: string;
  name!: string;
}

export class VendorTruckReviewListImageResponseDto {
  id!: string;
  imageUrl!: string;
  position!: number;
}

export class VendorTruckReviewListCustomerResponseDto {
  id!: string;
  name!: string;
  avatar?: string;
}

export class VendorTruckReviewListItemResponseDto {
  id!: string;

  customer!: VendorTruckReviewListCustomerResponseDto;

  rating!: number;
  reviewText?: string;

  images!: VendorTruckReviewListImageResponseDto[];
  tags!: VendorTruckReviewListTagResponseDto[];

  createdAt!: Date;
}

export class VendorTruckReviewsResponseDto {
  vendorId!: string;
  reviewAverage!: number;
  reviewCount!: number;

  items!: VendorTruckReviewListItemResponseDto[];

  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class VendorTruckReviewImageResponseDto {
  id!: string;
  imageUrl!: string;
  position!: number;
}

export class VendorTruckReviewTagResponseDto {
  id!: string;
  name!: string;
}

export class CreateVendorTruckReviewResponseDto {
  id!: string;

  vendorId!: string;
  customerId!: string;

  rating!: number;
  reviewText?: string;

  images!: VendorTruckReviewImageResponseDto[];
  tags!: VendorTruckReviewTagResponseDto[];

  createdAt!: Date;
}

export class VendorTruckReviewTagListItemResponseDto {
  id!: string;
  name!: string;
}

export class VendorTruckReviewTagListResponseDto {
  items!: VendorTruckReviewTagListItemResponseDto[];
}

export class FoodReviewTagListItemResponseDto {
  id!: string;
  name!: string;
}

export class FoodReviewTagListResponseDto {
  items!: FoodReviewTagListItemResponseDto[];
}

export class FoodReviewImageResponseDto {
  id!: string;
  imageUrl!: string;
  position!: number;
}

export class FoodReviewTagResponseDto {
  id!: string;
  name!: string;
}

export class CreateFoodReviewResponseDto {
  id!: string;

  productId!: string;
  customerId!: string;
  orderItemId!: string;

  rating!: number;
  reviewText?: string;

  images!: FoodReviewImageResponseDto[];
  tags!: FoodReviewTagResponseDto[];

  createdAt!: Date;
}
