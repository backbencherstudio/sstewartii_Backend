export interface CreateVendorTruckReviewInput {
  vendorId: string;
  customerId: string;
  rating: number;
  reviewText?: string;
  imageUrls?: string[];
  tagIds?: string[];
}

export interface IVendorTruckReviewRepository {

  findExistingReview(data: {
    vendorId: string;
    customerId: string;
  }): Promise<{ id: string } | null>;

  validateTags(tagIds: string[]): Promise<{ id: string; name: string }[]>;

  createReview(data: CreateVendorTruckReviewInput): Promise<any>;

  findAllTags(): Promise<
    {
      id: string;
      name: string;
    }[]
  >;
}