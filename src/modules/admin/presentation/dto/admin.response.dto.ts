import { 
  VerificationStatus,
  KycStatus,
  SubscriptionStatus,
  VendorLiveStatus,
  OrderStatus,
 } from '@prisma/client';

import {
  DashboardRevenueMetric,
  DashboardRevenueRange,
  AdminVendorOverviewRange,
} from './admin.dto';

export class VendorVerificationStatsDto {
  totalPending!: number;
  rejectedVerifications!: number;
  avgReviewTimeDays!: number;
  rejectionRate!: number;
}

export class VendorVerificationDocumentStatusDto {
  businessLicense!: boolean;
  healthPermit!: boolean;
  insuranceProof!: boolean;
}

export class VendorVerificationListItemDto {
  verificationId!: string;
  vendorId!: string;
  vendorCode!: string;
  vendorName!: string;
  publicEmail?: string;
  contactNumber?: string;
  status!: VerificationStatus;
  documents!: VendorVerificationDocumentStatusDto;
  submittedAt!: Date;
  submissionDateLabel!: string;
}

export class VendorVerificationPaginationDto {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class VendorVerificationManagementResponseDto {
  stats!: VendorVerificationStatsDto;
  pagination!: VendorVerificationPaginationDto;
  items!: VendorVerificationListItemDto[];
}

export class AdminVendorVerificationDocumentDto {
  serial!: string;
  type!: string;
  label!: string;
  fileName!: string;
  fileUrl!: string;
  status!: 'ACTIVE' | 'EXPIRED' | 'MISSING';
  expirationDate?: Date;
  expirationDateLabel?: string;
}

export class AdminVendorVerificationVendorDto {
  id!: string;
  vendorCode!: string;
  businessName!: string;
  coverImage?: string;
  ownerName!: string;
  ownerEmail!: string;
  publicEmail?: string;
  contactNumber?: string;
  joinedAt!: Date;
  joinedAtLabel!: string;
}

export class AdminVendorVerificationDetailResponseDto {
  verificationId!: string;
  vendorId!: string;
  vendorCode!: string;
  status!: VerificationStatus;
  submittedAt!: Date;
  submittedAtLabel!: string;
  rejectionReason?: string;
  documents!: AdminVendorVerificationDocumentDto[];
  vendor!: AdminVendorVerificationVendorDto;
  decision!: {
    canApprove: boolean;
    canReject: boolean;
    message: string;
  };
}

export class AdminVendorVerificationFileResponseDto {
  verificationId!: string;
  vendorId!: string;
  documentType!: string;
  label!: string;
  fileName!: string;
  fileUrl!: string;
  mimeType?: string;
}

export class AdminDashboardSummaryDto {
  totalVendors!: number;
  totalCustomers!: number;
  activeTrucksToday!: number;
  platformRevenue!: number;
  currency!: string;
}

export class AdminDashboardAlertsDto {
  issuesNeedAttention!: number;
  pendingOnboarding!: number;
  inactiveVendors!: number;
  todayRevenue!: number;
  currency!: string;
}

export class AdminDashboardVendorStatusDto {
  pending!: number;
  verified!: number;
  expired!: number;
  suspended!: number;
  rejected!: number;
  total!: number;
}

export class AdminDashboardOverviewResponseDto {
  summary!: AdminDashboardSummaryDto;
  alerts!: AdminDashboardAlertsDto;
  vendorsByStatus!: AdminDashboardVendorStatusDto;
  lastUpdatedAt!: Date;
}

export class AdminDashboardRevenueChartItemDto {
  label!: string;
  value!: number;
}

export class AdminDashboardRevenueResponseDto {
  range!: DashboardRevenueRange;
  metric!: DashboardRevenueMetric;
  currency!: string;
  total!: number;
  items!: AdminDashboardRevenueChartItemDto[];
  lastUpdatedAt!: Date;
}

export class AdminVendorVerificationActionResponseDto {
  verificationId!: string;
  vendorId!: string;
  status!: VerificationStatus;
  reviewedAt!: Date;
  message!: string;
}

export class AdminVendorAccountStatsDto {
  totalVendors!: number;
  verifiedVendors!: number;
  newThisMonth!: number;
  suspendedVendors!: number;
}

export class AdminVendorAccountListItemDto {
  vendorId!: string;
  vendorCode!: string;

  businessName!: string;
  ownerName!: string;
  email!: string;

  status!: KycStatus;
  statusLabel!: string;

  subscriptionStatus!: SubscriptionStatus;
  subscriptionStatusLabel!: string;

  dateJoined!: Date;
  dateJoinedLabel!: string;
}

export class AdminVendorAccountPaginationDto {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class AdminVendorAccountListResponseDto {
  stats!: AdminVendorAccountStatsDto;
  items!: AdminVendorAccountListItemDto[];
  pagination!: AdminVendorAccountPaginationDto;
}

export class AdminVendorOverviewProfileDto {
  id!: string;
  vendorCode!: string;
  businessName!: string;
  coverImage?: string;
  status!: VendorLiveStatus;
  statusLabel!: string;
  kycStatus!: KycStatus;
  kycStatusLabel!: string;
  joinedAt!: Date;
  joinedAtLabel!: string;
  currentPlan?: string;
  subscriptionStatus!: SubscriptionStatus;
  rating!: number;
  reviewCount!: number;
  totalRevenue!: number;
}

export class AdminVendorOverviewContactInfoDto {
  ownerName!: string;
  registeredEmail!: string;
  publicEmail?: string;
  contactNumber?: string;
}

export class AdminVendorOverviewBusinessProfileDto {
  bio?: string;
  cuisines!: string[];
  socialLinks!: {
    id: string;
    url: string;
  }[];
}

export class AdminVendorOverviewOrderDistributionDto {
  totalOrders!: number;
  itemsSold!: number;
  completed!: number;
  cancelled!: number;
  incomplete!: number;
  completedPercent!: number;
  cancelledPercent!: number;
  incompletePercent!: number;
}

export class AdminVendorOverviewChartItemDto {
  label!: string;
  value!: number;
}

export class AdminVendorOverviewRevenueChartDto {
  range!: AdminVendorOverviewRange;
  total!: number;
  currency!: string;
  items!: AdminVendorOverviewChartItemDto[];
}

export class AdminVendorOverviewCustomerEngagementItemDto {
  label!: string;
  newCustomers!: number;
  repeatedCustomers!: number;
}

export class AdminVendorOverviewCustomerEngagementDto {
  range!: AdminVendorOverviewRange;
  totalCustomers!: number;
  newCustomers!: number;
  repeatedCustomers!: number;
  repeatRate!: number;
  items!: AdminVendorOverviewCustomerEngagementItemDto[];
}

export class AdminVendorOverviewServiceAreaDto {
  address?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export class AdminVendorOverviewProfileViewsDto {
  range!: AdminVendorOverviewRange;
  total!: number;
  growthPercent!: number;
  items!: AdminVendorOverviewChartItemDto[];
}

export class AdminVendorOverviewFavoritesDto {
  count!: number;
  recent!: {
    customerId: string;
    customerName: string;
    email?: string;
    favoritedAt: Date;
    orderCount: number;
    totalSpent: number;
  }[];
}

export class AdminVendorAccountOverviewResponseDto {
  vendor!: AdminVendorOverviewProfileDto;
  contactInfo!: AdminVendorOverviewContactInfoDto;
  businessProfile!: AdminVendorOverviewBusinessProfileDto;
  orderDistribution!: AdminVendorOverviewOrderDistributionDto;
  revenueChart!: AdminVendorOverviewRevenueChartDto;
  customerEngagement!: AdminVendorOverviewCustomerEngagementDto;
  serviceArea!: AdminVendorOverviewServiceAreaDto;
  profileViews!: AdminVendorOverviewProfileViewsDto;
  favorites!: AdminVendorOverviewFavoritesDto;
  lastUpdatedAt!: Date;
}

export class AdminVendorAccountOrderCustomerDto {
  id!: string;
  name!: string;
  email!: string;
}

export class AdminVendorAccountOrderListItemDto {
  id!: string;
  orderNumber!: string;
  orderCode!: string;

  customer!: AdminVendorAccountOrderCustomerDto;

  date!: Date;
  dateLabel!: string;
  timeLabel!: string;

  totalAmount!: number;

  status!: OrderStatus;
  statusLabel!: string;
}

export class AdminVendorAccountOrdersPaginationDto {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class AdminVendorAccountOrdersResponseDto {
  items!: AdminVendorAccountOrderListItemDto[];
  pagination!: AdminVendorAccountOrdersPaginationDto;
}

export class AdminVendorDocumentItemDto {
  id!: string;
  documentType!: string; 
  documentName!: string;
  status!: 'ACTIVE' | 'EXPIRED';
  statusLabel!: string;
  uploadedAt!: Date;
  uploadedAtLabel!: string;
  expiresAt?: Date;
  expiresAtLabel?: string;
  fileUrl!: string;
}

export class AdminVendorDocumentsResponseDto {
  items!: AdminVendorDocumentItemDto[];
}

export class AdminVendorSubscriptionItemDto {
  invoiceId!: string;
  planName!: string;
  provider!: string;
  status!: string;
  startDate!: Date;
  startDateLabel!: string;
  endDate?: Date;
  endDateLabel?: string;
  isCurrent!: boolean;
}

export class AdminVendorSubscriptionResponseDto {
  items!: AdminVendorSubscriptionItemDto[];
}
