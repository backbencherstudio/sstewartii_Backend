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