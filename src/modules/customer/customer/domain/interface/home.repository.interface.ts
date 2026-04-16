export interface CustomerHomeProfile {
  id: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface IHomeRepository {
  findCustomerHomeProfileByUserId(
    userId: string,
  ): Promise<CustomerHomeProfile | null>;

  findVendorCandidates(): Promise<any[]>;

  findDistinctCategoryNames(limit: number): Promise<string[]>;

  findPopularCuisines(limit: number): Promise<{ id: string; name: string }[]>;

  findProductsForHome(
    vendorIds: string[],
    limit: number,
    excludeProductIds?: string[],
  ): Promise<any[]>;

  findProductsFallback(
    limit: number,
    excludeProductIds?: string[],
  ): Promise<any[]>;
}