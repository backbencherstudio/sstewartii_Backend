import {
  OperationHourDto,
  SetupProfileDto,
  ServiceAreaDto,
  UpdateServiceAreaDto,
} from '../../presentation/dto/profile-setup-flow.dto';

export interface CuisineView {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorProfileSetupView {
  id: string;
  businessName: string | null;
  publicEmail: string | null;
  contactNumber: string | null;
  bio: string | null;
  coverImage: string | null;
  onboardingStep: number;

  cuisines: {
    cuisine: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
  }[];

  socialLinks: {
    id: string;
    url: string | null;
  }[];
}

// main interface
export interface IProfileSetupRepository {
  updateProfileAndSyncRelations(
    userId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<VendorProfileSetupView>;

  createOperationHourVersion(
    userId: string,
    hours: OperationHourDto[],
  ): Promise<void>;

  upsertServiceArea(userId: string, data: ServiceAreaDto): Promise<void>;

  updateServiceArea(userId: string, dto: UpdateServiceAreaDto): Promise<void>;

  findByName(name: string): Promise<CuisineView | null>;

  createCuisine(data: {
    name: string;
    imageUrl?: string;
  }): Promise<CuisineView>;

  findAllCuisine(): Promise<CuisineView[]>;
}
