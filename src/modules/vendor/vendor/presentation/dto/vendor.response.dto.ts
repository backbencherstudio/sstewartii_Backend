export class VendorMenuProductResponseDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  estimateCookTime!: number;
  image?: string;
  categoryName?: string;
}

export class VendorMenuSectionResponseDto {
  categoryId!: string;
  categoryName!: string;
  products!: VendorMenuProductResponseDto[];
}

export class VendorMenuVendorInfoResponseDto {
  id!: string;
  businessName!: string;
  coverImage?: string;
  bio?: string;
  cityLabel?: string;
  distanceKm?: number;
  isOpen!: boolean;
  statusLabel!: string;
  reviewAverage!: number;
  reviewCount!: number;
  cuisines!: string[];
}

export class VendorMenuResponseDto {
  vendor!: VendorMenuVendorInfoResponseDto;
  sections!: VendorMenuSectionResponseDto[];
}