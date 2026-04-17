export interface CreateReviewInput {
  vendorId: string;
  customerId: string;
  orderId: string;
  rating: number;
  reviewText?: string;
  imageUrls?: string[];
  tagIds?: string[];
}

export interface IReviewRepository {
  findCustomerByUserId(userId: string): Promise<{
    id: string;
    isActive: boolean;
  } | null>;

  findCompletedOrderForReview(orderId: string): Promise<{
    id: string;
    customerId: string;
    vendorId: string;
    status: string;
  } | null>;

  findExistingReviewByOrderId(orderId: string): Promise<{
    id: string;
  } | null>;

  validateReviewTagIds(tagIds: string[]): Promise<string[]>;

  createReview(input: CreateReviewInput): Promise<any>;

  getVendorReviewStats(vendorId: string): Promise<{
    average: number;
    count: number;
  }>;

  updateVendorReviewSummary(
    vendorId: string,
    average: number,
    count: number,
  ): Promise<void>;
}