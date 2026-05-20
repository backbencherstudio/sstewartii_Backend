import { VerificationStatus } from '@prisma/client';
import { VendorVerificationSort } from '../../presentation/dto/admin.dto';

export interface FindVendorVerificationsInput {
  status?: VerificationStatus;
  page: number;
  limit: number;
  sort: VendorVerificationSort;
}

export interface VendorVerificationListResult {
  total: number;
  items: any[];
}

export interface VendorVerificationStatsResult {
  totalPending: number;
  rejectedVerifications: number;
  avgReviewTimeDays: number;
  rejectionRate: number;
}

export interface AdminDashboardOverviewRaw {
  totalVendors: number;
  totalCustomers: number;
  activeTrucksToday: number;

  platformRevenue: number;
  todayRevenue: number;
  currency: string;

  issuesNeedAttention: number;
  pendingOnboarding: number;
  inactiveVendors: number;

  vendorsByStatus: {
    pending: number;
    verified: number;
    expired: number;
    suspended: number;
    rejected: number;
    total: number;
  };
}

export interface IAdminVendorVerificationRepository {
  findManagementList(
    input: FindVendorVerificationsInput,
  ): Promise<VendorVerificationListResult>;

  getManagementStats(): Promise<VendorVerificationStatsResult>;

  findDetailById(verificationId: string): Promise<any | null>;
  
  findDocumentFileByVerificationId(
    verificationId: string,
  ): Promise<any | null>;

  getOverview(): Promise<AdminDashboardOverviewRaw>;
}