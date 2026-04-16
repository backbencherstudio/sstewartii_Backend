export class HomeUserDto {
  id!: string;
  name!: string;
  email!: string;
}

export class HomeLocationDto {
  address?: string;
  latitude!: number;
  longitude!: number;
}

export class HomeCategoryDto {
  name!: string;
}

export class HomeCuisineDto {
  id!: string;
  name!: string;
}

export class HomeVendorCardDto {
  id!: string;
  businessName!: string;
  coverImage?: string;
  distanceKm!: number;
  cityLabel?: string;
  isOpen!: boolean;
  statusLabel!: string;
}

export class HomeProductCardDto {
  id!: string;
  name!: string;
  image?: string;
  price!: number;
  vendorId!: string;
  vendorName!: string;
  distanceKm!: number;
  categoryName?: string;
}

export class HomeResponseDto {
  user!: HomeUserDto;
  currentLocation!: HomeLocationDto;
  categories!: HomeCategoryDto[];
  popularCuisines!: HomeCuisineDto[];
  whatsNearMe!: HomeVendorCardDto[];
  recommendedForYou!: HomeVendorCardDto[];
  topPicksForYou!: HomeProductCardDto[];
  trySomethingNew!: HomeProductCardDto[];
}