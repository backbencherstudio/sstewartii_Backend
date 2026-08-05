import {
  SetupProfileDto,
  ServiceAreaDto,
  UpdateServiceAreaDto,
  UpsertOperationHoursDto,
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

// Operation Hour Response Types
export interface OperationHourDetailView {
  id: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  priority: number;
  activeFrom: Date;
  activeTo: Date | null;
  leavingSoonEnabled: boolean;
  leavingSoonMinutes: number;
  customLeavingTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodayStatusView {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  leavingSoonEnabled: boolean;
  leavingSoonMinutes: number | null;
  customLeavingTime: string | null;
  timeUntilClose: number | null;
  timeUntilLeavingSoon: number | null;
}

export interface OperationHoursResponseView {
  vendorId: string;
  activePeriodStart: Date;
  activePeriodEnd: Date | null;
  hours: OperationHourDetailView[];
  todayStatus: TodayStatusView;
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
    dto: UpsertOperationHoursDto,
  ): Promise<OperationHoursResponseView>;

  findOperationHoursByVendorId(
    vendorId: string,
  ): Promise<OperationHoursResponseView | null>;

  upsertServiceArea(userId: string, data: ServiceAreaDto): Promise<void>;

  updateServiceArea(userId: string, dto: UpdateServiceAreaDto): Promise<void>;

  findByName(name: string): Promise<CuisineView | null>;

  createCuisine(data: {
    name: string;
    imageUrl?: string;
  }): Promise<CuisineView>;

  findAllCuisine(): Promise<CuisineView[]>;
}
