// src/modules/admin/vendor-verification/infrastructure/mapper/admin-vendor-verification.mapper.ts

import { Injectable } from '@nestjs/common';
import {
  VendorVerificationManagementResponseDto,
  VendorVerificationListItemDto,
} from '../../presentation/dto/vendor-verification.response.dto';
import type {
  VendorVerificationListResult,
  VendorVerificationStatsResult,
} from '../../domain/interface/admin-vendor-verification.repository.interface';

@Injectable()
export class AdminMapper {
  toManagementResponse(data: {
    stats: VendorVerificationStatsResult;
    result: VendorVerificationListResult;
    page: number;
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
}