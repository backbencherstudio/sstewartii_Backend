export class CustomerResponseDto {
  id!: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export class NearbyVendorCardResponseDto {
  id!: string;
  businessName!: string;
  coverImage?: string;
  distanceKm!: number;
  cityLabel?: string;
  isOpen!: boolean;
  statusLabel!: string;
  cuisines!: string[];

  rating!: number;
  reviewCount!: number;
}

export class NearbyVendorsResponseDto {
  items!: NearbyVendorCardResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class TopPickProductCardResponseDto {
  id!: string;
  name!: string;
  image?: string;
  price!: number;

  vendorId!: string;
  vendorName!: string;

  rating!: number;
  reviewCount!: number;

  categoryName?: string;
  distanceKm!: number;
}

export class TopPicksResponseDto {
  items!: TopPickProductCardResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class ExploreMapPinResponseDto {
  vendorId!: string;
  businessName!: string;
  latitude!: number;
  longitude!: number;
  coverImage?: string;
  rating!: number;
  reviewCount!: number;
  distanceKm!: number;
  isOpen!: boolean;
  statusLabel!: string;
}

export class ExploreMapCardResponseDto {
  vendorId!: string;
  businessName!: string;
  coverImage?: string;
  cuisines!: string[];
  rating!: number;
  reviewCount!: number;
  distanceKm!: number;
  isOpen!: boolean;
  statusLabel!: string;
  cityLabel?: string;
}

export class ExploreMapResponseDto {
  center!: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  pins!: ExploreMapPinResponseDto[];
  cards!: ExploreMapCardResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class FoodCardResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  image?: string;

  vendorId!: string;
  vendorName!: string;

  categoryName?: string;
  cuisines!: string[];

  rating!: number;
  reviewCount!: number;

  distanceKm!: number;
  isOpen!: boolean;
  statusLabel!: string;
}

export class FoodFilterResponseDto {
  items!: FoodCardResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class FavoriteProductItemResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  image?: string;

  vendorId!: string;
  vendorName!: string;

  categoryName?: string;

  rating!: number;
  reviewCount!: number;

  isFavorited!: boolean;
}

export class FavoriteProductsResponseDto {
  items!: FavoriteProductItemResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class FavoriteVendorItemResponseDto {
  id!: string;
  businessName!: string;
  coverImage?: string;

  cuisines!: string[];

  rating!: number;
  reviewCount!: number;

  cityLabel?: string;
  distanceKm?: number;

  isOpen!: boolean;
  statusLabel!: string;

  isFavorited!: boolean;
}

export class FavoriteVendorsResponseDto {
  items!: FavoriteVendorItemResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class AdvancedSearchFoodItemResponseDto {
  type!: 'FOOD';

  id!: string;
  name!: string;
  description!: string;
  price!: number;
  image?: string;

  vendorId!: string;
  vendorName!: string;

  categoryName?: string;
  cuisines!: string[];

  rating!: number;
  reviewCount!: number;

  distanceKm!: number;
  isOpen!: boolean;
  statusLabel!: string;

  isFavorited!: boolean;
}

export class AdvancedSearchTruckItemResponseDto {
  type!: 'TRUCK';

  id!: string;
  businessName!: string;
  coverImage?: string;

  cityLabel?: string;
  address?: string;

  cuisines!: string[];

  rating!: number;
  reviewCount!: number;

  distanceKm!: number;
  isOpen!: boolean;
  statusLabel!: string;

  isFavorited!: boolean;
}

export class CustomerAdvancedSearchResponseDto {
  type!: 'FOOD' | 'TRUCK';
  search?: string;

  items!: Array<
    AdvancedSearchFoodItemResponseDto | AdvancedSearchTruckItemResponseDto
  >;

  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}