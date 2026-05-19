import { VerificationStatus } from '@prisma/client';

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