export class HomeUserDto {
  id!: string;
  email!: string;
  name!: string;
}

export class HomeLocationDto {
  address?: string;
  latitude!: number;
  longitude!: number;
}

export class HomeCategoryDto {
  id!: string;
  name!: string;
}

export class HomeCuisineDto {
  id!: string;
  name!: string;
  imageUrl?: string;
}

export class HomeVendorCardDto {
  id!: string;
  businessName!: string;
  bio?: string;
  coverImage?: string;
  distanceKm!: number;
  cityLabel?: string;
  isOpen!: boolean;
  statusLabel!: string;
  rating!: number;
  reviewCount!: number;
  isFavorite!: boolean;
}

export class HomeProductCardDto {
  id!: string;
  name!: string;
  image?: string;
  price!: number;
  vendorId!: string;
  vendorName!: string;
  distanceKm!: number;
  categoryId?: string;
  categoryName?: string;
  rating!: number;
  reviewCount!: number;
  isFavorite!: boolean;
}

export class HomeResponseDto {
  user!: HomeUserDto;
  currentLocation!: HomeLocationDto;

  categories!: HomeCategoryDto[];
  popularCuisines!: HomeCuisineDto[];

  whatsNearMe!: HomeVendorCardDto[];
  recommendedForYou!: HomeVendorCardDto[];

  explorePopularTrucksNearby!: HomeVendorCardDto[];

  topPicksForYou!: HomeProductCardDto[];
  trySomethingNew!: HomeProductCardDto[];
}
