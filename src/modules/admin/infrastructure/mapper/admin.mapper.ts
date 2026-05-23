import { 
  VerificationStatus,
  KycStatus,
  SubscriptionStatus,
  VendorLiveStatus,
} from '@prisma/client';

import { 
    Injectable,
    NotFoundException,
 } from '@nestjs/common';

import {
  AdminVendorVerificationDocumentType,
  DashboardRevenueRange,
  DashboardRevenueMetric,
  AdminVendorOverviewRange,
} from '../../presentation/dto/admin.dto';
import {
  VendorVerificationManagementResponseDto,
  VendorVerificationListItemDto,
  AdminVendorVerificationDetailResponseDto,
  AdminVendorVerificationFileResponseDto,
  AdminDashboardOverviewResponseDto,
  AdminDashboardRevenueResponseDto,
  AdminVendorVerificationActionResponseDto,
  AdminVendorAccountListResponseDto,
  AdminVendorAccountListItemDto,
  AdminVendorOverviewChartItemDto,
  AdminVendorOverviewCustomerEngagementItemDto,
  AdminVendorAccountOverviewResponseDto
} from '../../presentation/dto/admin.response.dto';

import type {
  VendorVerificationListResult,
  VendorVerificationStatsResult,
  AdminDashboardOverviewRaw,
  AdminVendorAccountStatsResult,
  AdminVendorAccountListResult,
} from '../../domain/interface/admin.repository.interface';

import { MediaService } from '@/common/media/media.service';

export interface RevenueChartItem {
  label: string;
  value: number;
}

@Injectable()
export class AdminMapper {
 constructor(private readonly mediaService: MediaService) {}

  toManagementResponse(data: {
    stats: VendorVerificationStatsResult;
    result: VendorVerificationListResult;
    page:  number;
    limit: number;
  }): VendorVerificationManagementResponseDto {

    return {
      stats: {
        totalPending: data.stats.totalPending,
        rejectedVerifications: data.stats.rejectedVerifications,
        avgReviewTimeDays: data.stats.avgReviewTimeDays,
        rejectionRate: data.stats.rejectionRate,
      },

      pagination: {
        total: data.result.total,
        page: data.page,
        limit: data.limit,
        totalPages:
          data.result.total === 0
            ? 0
            : Math.ceil(data.result.total / data.limit),
      },

      items: data.result.items.map((item) =>
        this.toListItemResponse(item),
      ),
    };
  }

  private toListItemResponse(item: any): VendorVerificationListItemDto {
    return {
      verificationId: item.id,
      vendorId: item.vendor.id,
      vendorCode: this.buildVendorCode(item.vendor.id),

      vendorName:
        item.vendor.businessName ??
        item.vendor.owner?.name ??
        item.vendor.owner?.email ??
        'Unnamed Vendor',

      publicEmail: item.vendor.publicEmail ?? item.vendor.owner?.email,
      contactNumber: item.vendor.contactNumber ?? undefined,

      status: item.status,

      documents: {
        businessLicense: Boolean(item.businessLicense),
        healthPermit: Boolean(item.healthPermit),
        insuranceProof: Boolean(item.insuranceProof),
      },

      submittedAt: item.submittedAt,
      submissionDateLabel: this.formatDate(item.submittedAt),
    };
  }

  private buildVendorCode(vendorId: string): string {
    return `#${vendorId.slice(0, 6).toUpperCase()}`;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  toDetailResponse(
    verification: any,
  ): AdminVendorVerificationDetailResponseDto {
    const documents = [
      {
        serial: '01',
        type: 'BUSINESS_LICENSE',
        label: 'Business License',
        filePath: verification.businessLicense,
      },
      {
        serial: '02',
        type: 'HEALTH_PERMIT',
        label: 'Health Permit',
        filePath: verification.healthPermit,
      },
      {
        serial: '03',
        type: 'INSURANCE_PROOF',
        label: 'Proof of Insurance',
        filePath: verification.insuranceProof,
      },
    ];

    return {
      verificationId: verification.id,
      vendorId: verification.vendor.id,
      vendorCode: this.buildVendorCode(verification.vendor.id),

      status: verification.status,
      submittedAt: verification.submittedAt,
      submittedAtLabel: this.formatDate(verification.submittedAt),

      rejectionReason: verification.rejectionReason ?? undefined,

      documents: documents.map((document) => ({
        serial: document.serial,
        type: document.type,
        label: document.label,
        fileName: this.extractFileName(document.filePath),
        fileUrl: this.resolveMediaUrl(document.filePath),
        status: document.filePath ? 'ACTIVE' : 'MISSING',
        expirationDate: undefined,
        expirationDateLabel: undefined,
      })),

      vendor: {
        id: verification.vendor.id,
        vendorCode: this.buildVendorCode(verification.vendor.id),
        businessName:
          verification.vendor.businessName ??
          verification.vendor.owner?.name ??
          'Unnamed Vendor',

        coverImage: verification.vendor.coverImage
          ? this.resolveMediaUrl(verification.vendor.coverImage)
          : undefined,

        ownerName:
          verification.vendor.owner?.name ??
          verification.vendor.owner?.email ??
          'Vendor',

        ownerEmail: verification.vendor.owner?.email,

        publicEmail:
          verification.vendor.publicEmail ??
          verification.vendor.owner?.email ??
          undefined,

        contactNumber: verification.vendor.contactNumber ?? undefined,

        joinedAt: verification.vendor.createdAt,
        joinedAtLabel: `Joined on ${this.formatDate(
          verification.vendor.createdAt,
        )}`,
      },

      decision: {
        canApprove:
          verification.status === VerificationStatus.PENDING ||
          verification.status === VerificationStatus.IN_REVIEW,

        canReject:
          verification.status === VerificationStatus.PENDING ||
          verification.status === VerificationStatus.IN_REVIEW,

        message:
          verification.status === VerificationStatus.APPROVED
            ? 'This verification has already been approved.'
            : verification.status === VerificationStatus.REJECTED
              ? 'This verification has already been rejected.'
              : 'Please verify all document details before submitting a final decision.',
      },
    };
  }

  private extractFileName(path: string | null | undefined): string {
    if (!path) {
      return 'Missing Document';
    }

    return path.split('/').pop() ?? path;
  }

  private resolveMediaUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }

  toFileResponse(data: {
    verification: any;
    documentType: AdminVendorVerificationDocumentType;
  }): AdminVendorVerificationFileResponseDto {
    const filePath = this.getDocumentFilePath(
        data.verification,
        data.documentType,
    );

    if (!filePath) {
        throw new NotFoundException('Document file not found');
    }

    return {
        verificationId: data.verification.id,
        vendorId: data.verification.vendor.id,

        documentType: data.documentType,
        label: this.getDocumentLabel(data.documentType),

        fileName: this.extractFileName1(filePath),
        fileUrl: this.resolveMediaUrl(filePath),
        mimeType: this.resolveMimeType(filePath),
     };
   }

  private getDocumentFilePath(
     verification: any,
     documentType: AdminVendorVerificationDocumentType,
   ): string | null {
    switch (documentType) {
        case AdminVendorVerificationDocumentType.BUSINESS_LICENSE:
        return verification.businessLicense;

        case AdminVendorVerificationDocumentType.HEALTH_PERMIT:
        return verification.healthPermit;

        case AdminVendorVerificationDocumentType.INSURANCE_PROOF:
        return verification.insuranceProof;

        default:
        return null;
      }
    }

  private getDocumentLabel(
    documentType: AdminVendorVerificationDocumentType,
  ): string {
  switch (documentType) {
      case AdminVendorVerificationDocumentType.BUSINESS_LICENSE:
      return 'Business License';

      case AdminVendorVerificationDocumentType.HEALTH_PERMIT:
      return 'Health Permit';

      case AdminVendorVerificationDocumentType.INSURANCE_PROOF:
      return 'Proof of Insurance';

      default:
      return 'Document';
    }
  }

  private extractFileName1(path: string): string {
    return path.split('/').pop() ?? path;
  }

  private resolveMimeType(path: string): string | undefined {
    const extension = path.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'pdf':
        return 'application/pdf';

        case 'jpg':
        case 'jpeg':
        return 'image/jpeg';

        case 'png':
        return 'image/png';

        case 'webp':
        return 'image/webp';

        default:
        return undefined;
    }
  }

  toOverviewResponse(
    data: AdminDashboardOverviewRaw,
  ): AdminDashboardOverviewResponseDto {
    return {
      summary: {
        totalVendors: data.totalVendors,
        totalCustomers: data.totalCustomers,
        activeTrucksToday: data.activeTrucksToday,
        platformRevenue: Number(data.platformRevenue.toFixed(2)),
        currency: data.currency,
      },

      alerts: {
        issuesNeedAttention: data.issuesNeedAttention,
        pendingOnboarding: data.pendingOnboarding,
        inactiveVendors: data.inactiveVendors,
        todayRevenue: Number(data.todayRevenue.toFixed(2)),
        currency: data.currency,
      },

      vendorsByStatus: {
        pending: data.vendorsByStatus.pending,
        verified: data.vendorsByStatus.verified,
        expired: data.vendorsByStatus.expired,
        suspended: data.vendorsByStatus.suspended,
        rejected: data.vendorsByStatus.rejected,
        total: data.vendorsByStatus.total,
      },

      lastUpdatedAt: new Date(),
    };
  }

  toRevenueResponse(data: {
    range: DashboardRevenueRange;
    metric: DashboardRevenueMetric;
    currency: string;
    total: number;
    items: RevenueChartItem[];
  }): AdminDashboardRevenueResponseDto {
    return {
      range: data.range,
      metric: data.metric,
      currency: data.currency,
      total: Number(data.total.toFixed(2)),
      items: data.items.map((item) => ({
        label: item.label,
        value: Number(item.value.toFixed(2)),
      })),
      lastUpdatedAt: new Date(),
    };
  }

  toActionResponse(data: {
    verification: {
      id: string;
      vendorId: string;
      status: any;
      reviewedAt: Date | null;
    };
    message: string;
  }): AdminVendorVerificationActionResponseDto {
    return {
      verificationId: data.verification.id,
      vendorId: data.verification.vendorId,
      status: data.verification.status,
      reviewedAt: data.verification.reviewedAt ?? new Date(),
      message: data.message,
    };
  }

  toListResponse(data: {
    stats: AdminVendorAccountStatsResult;
    result: AdminVendorAccountListResult;
    page: number;
    limit: number;
  }): AdminVendorAccountListResponseDto {
    return {
      stats: {
        totalVendors: data.stats.totalVendors,
        verifiedVendors: data.stats.verifiedVendors,
        newThisMonth: data.stats.newThisMonth,
        suspendedVendors: data.stats.suspendedVendors,
      },

      items: data.result.items.map((vendor) =>
        this.toListItemResponse1(vendor),
      ),

      pagination: {
        total: data.result.total,
        page: data.page,
        limit: data.limit,
        totalPages:
          data.result.total === 0
            ? 0
            : Math.ceil(data.result.total / data.limit),
      },
    };
  }

  private toListItemResponse1(vendor: any): AdminVendorAccountListItemDto {
    return {
      vendorId: vendor.id,
      vendorCode: vendor.vendorCode,

      businessName:
        vendor.businessName ??
        vendor.owner?.name ??
        'Unnamed Vendor',

      ownerName:
        vendor.owner?.name ??
        vendor.businessName ??
        'Unnamed Vendor',

      email:
        vendor.publicEmail ??
        vendor.owner?.email ??
        'No email found',

      status: vendor.kycStatus,
      statusLabel: this.toKycStatusLabel(vendor.kycStatus),

      subscriptionStatus: vendor.subscriptionStatus,
      subscriptionStatusLabel: this.toSubscriptionStatusLabel(
        vendor.subscriptionStatus,
      ),

      dateJoined: vendor.createdAt,
      dateJoinedLabel: this.formatDate1(vendor.createdAt),
    };
  }

  private toKycStatusLabel(status: KycStatus): string {
    switch (status) {
      case KycStatus.APPROVED:
        return 'Verified';

      case KycStatus.REJECTED:
        return 'Rejected';

      case KycStatus.PENDING_REVIEW:
        return 'Pending';

      case KycStatus.UNVERIFIED:
      default:
        return 'Unverified';
    }
  }

  private toSubscriptionStatusLabel(status: SubscriptionStatus): string {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'Active';

      case SubscriptionStatus.INACTIVE:
        return 'Inactive';

      case SubscriptionStatus.EXPIRED:
        return 'Expired';

      case SubscriptionStatus.CANCELLED:
        return 'Cancelled';

      case SubscriptionStatus.CANCELLED:
        return 'Grace Period';

      case SubscriptionStatus.CANCELLED:
        return 'Billing Retry';

      default:
        return 'Unknown';
    }
  }

  private formatDate1(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  toOverviewResponse1(data: {
    vendor: any;
    range: AdminVendorOverviewRange;
    totalRevenue: number;
    orderDistribution: {
      totalOrders: number;
      itemsSold: number;
      completed: number;
      cancelled: number;
      incomplete: number;
      completedPercent: number;
      cancelledPercent: number;
      incompletePercent: number;
    };
    revenueChart: {
      total: number;
      currency: string;
      items: AdminVendorOverviewChartItemDto[];
    };
    customerEngagement: {
      totalCustomers: number;
      newCustomers: number;
      repeatedCustomers: number;
      repeatRate: number;
      items: AdminVendorOverviewCustomerEngagementItemDto[];
    };
    profileViews: {
      total: number;
      growthPercent: number;
      items: AdminVendorOverviewChartItemDto[];
    };
    favorites: {
      count: number;
      recent: {
        customerId: string;
        customerName: string;
        email?: string;
        favoritedAt: Date;
        orderCount: number;
        totalSpent: number;
      }[];
    };
  }): AdminVendorAccountOverviewResponseDto {
    const vendor = data.vendor;

    return {
      vendor: {
        id: vendor.id,
        vendorCode: vendor.vendorCode,
        businessName:
          vendor.businessName ??
          vendor.owner?.name ??
          'Unnamed Vendor',
        coverImage: vendor.coverImage
          ? this.mediaService.getUrl(vendor.coverImage)
          : undefined,
        status: vendor.status,
        statusLabel: this.toVendorLiveStatusLabel(vendor.status),
        kycStatus: vendor.kycStatus,
        kycStatusLabel: this.toKycStatusLabel(vendor.kycStatus),
        joinedAt: vendor.createdAt,
        joinedAtLabel: `Joined on ${this.formatDate1(vendor.createdAt)}`,
        currentPlan: vendor.subscriptionPlan?.name,
        subscriptionStatus: vendor.subscriptionStatus,
        rating: Number((vendor.truckReviewAverage ?? 0).toFixed(1)),
        reviewCount: vendor.truckReviewCount ?? 0,
        totalRevenue: Number(data.totalRevenue.toFixed(2)),
      },

      contactInfo: {
        ownerName:
          vendor.owner?.name ??
          vendor.businessName ??
          'Unnamed Vendor',
        registeredEmail: vendor.owner?.email ?? 'No email found',
        publicEmail: vendor.publicEmail ?? undefined,
        contactNumber: vendor.contactNumber ?? undefined,
      },

      businessProfile: {
        bio: vendor.bio ?? undefined,
        cuisines:
          vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],
        socialLinks:
          vendor.socialLinks?.map((item: any) => ({
            id: item.id,
            url: item.url,
          })) ?? [],
      },

      orderDistribution: data.orderDistribution,

      revenueChart: {
        range: data.range,
        total: Number(data.revenueChart.total.toFixed(2)),
        currency: data.revenueChart.currency,
        items: data.revenueChart.items,
      },

      customerEngagement: {
        range: data.range,
        totalCustomers: data.customerEngagement.totalCustomers,
        newCustomers: data.customerEngagement.newCustomers,
        repeatedCustomers: data.customerEngagement.repeatedCustomers,
        repeatRate: data.customerEngagement.repeatRate,
        items: data.customerEngagement.items,
      },

      serviceArea: {
        address: vendor.serviceArea?.address ?? undefined,
        latitude: vendor.serviceArea?.latitude ?? undefined,
        longitude: vendor.serviceArea?.longitude ?? undefined,
        radius: vendor.serviceArea?.radius ?? undefined,
      },

      profileViews: {
        range: data.range,
        total: data.profileViews.total,
        growthPercent: data.profileViews.growthPercent,
        items: data.profileViews.items,
      },

      favorites: data.favorites,

      lastUpdatedAt: new Date(),
    };
  }

  private toVendorLiveStatusLabel(status: VendorLiveStatus): string {
    switch (status) {
      case VendorLiveStatus.ONLINE:
        return 'Online';

      case VendorLiveStatus.TEMPORARILY_CLOSED:
        return 'Temporarily Closed';

      case VendorLiveStatus.OFFLINE:
      default:
        return 'Offline';
    }
  }
}