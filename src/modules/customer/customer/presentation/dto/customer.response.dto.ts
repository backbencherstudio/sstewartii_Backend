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