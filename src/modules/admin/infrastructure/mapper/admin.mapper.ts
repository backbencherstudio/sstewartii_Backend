import { VerificationStatus } from '@prisma/client';
import { 
    Injectable,
 } from '@nestjs/common';
import {
  VendorVerificationManagementResponseDto,
  VendorVerificationListItemDto,
  AdminVendorVerificationDetailResponseDto,
} from '../../presentation/dto/admin.response.dto';
import type {
  VendorVerificationListResult,
  VendorVerificationStatsResult,
} from '../../domain/interface/admin.repository.interface';
import { MediaService } from '@/common/media/media.service';

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
}