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