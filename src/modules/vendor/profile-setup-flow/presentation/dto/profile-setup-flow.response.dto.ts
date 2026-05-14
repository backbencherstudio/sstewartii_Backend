export class VendorProfileCuisineResponseDto {
  id!: string;
  name!: string;
  imageUrl?: string;
}

export class VendorProfileSocialLinkResponseDto {
  id!: string;
  url!: string | null;
}

export class VendorProfileSetupResponseDto {
  id!: string;
  businessName!: string | null;
  publicEmail!: string | null;
  contactNumber!: string | null;
  bio!: string | null;
  coverImage?: string;

  onboardingStep!: number;

  cuisines!: VendorProfileCuisineResponseDto[];
  socialLinks!: VendorProfileSocialLinkResponseDto[];
}