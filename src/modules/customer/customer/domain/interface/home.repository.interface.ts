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

export interface HomeCategoryView {
  id: string;
  name: string;
}

export interface HomeCuisineView {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface IHomeRepository {
  findCustomerHomeProfileByUserId(
    userId: string,
  ): Promise<CustomerHomeProfile | null>;

  findVendorCandidates(): Promise<any[]>;

  findHomeCategories(limit: number): Promise<HomeCategoryView[]>;

  findDistinctCategoryNames(limit: number): Promise<string[]>;

  findPopularCuisines(limit: number): Promise<HomeCuisineView[]>;

  findProductsForHome(
    vendorIds: string[],
    limit: number,
    excludeProductIds?: string[],
  ): Promise<any[]>;

  findProductsFallback(
    limit: number,
    excludeProductIds?: string[],
  ): Promise<any[]>;

  findFavoriteVendorIdsByCustomerId(customerId: string): Promise<string[]>;

  findFavoriteProductIdsByCustomerId(customerId: string): Promise<string[]>;
}
