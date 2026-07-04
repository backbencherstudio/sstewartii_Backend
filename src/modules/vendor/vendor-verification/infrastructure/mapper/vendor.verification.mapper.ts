import { VendorVerification } from '../../domain/entities/vendor-verification.entity';
import { VerificationStatus } from '@prisma/client';

export class VendorVerificationMapper {
  static toDomain(raw: any): VendorVerification {
    return new VendorVerification(
      raw.id,
      raw.vendorId,
      raw.businessLicense,
      raw.healthPermit,
      raw.insuranceProof,
      raw.status as VerificationStatus,
      raw.rejectionReason ?? null,
      raw.submittedAt,
      raw.reviewedAt ?? null,
    );
  }
}
