import { VerificationStatus } from '@prisma/client';
import * as crypto from 'crypto';

export class VendorVerification {
  constructor(
    public id: string,
    public vendorId: string,
    public businessLicense: string,
    public healthPermit: string,
    public insuranceProof: string,
    public status: VerificationStatus,
    public rejectionReason?: string | null,
    public submittedAt?: Date,
    public reviewedAt?: Date | null,
  ) {}

  static createPending(
    vendorId: string,
    businessLicense: string,
    healthPermit: string,
    insuranceProof: string,
  ): VendorVerification {
    return new VendorVerification(
      crypto.randomUUID(),
      vendorId,
      businessLicense,
      healthPermit,
      insuranceProof,
      VerificationStatus.PENDING,
      null,
      new Date(),
      null,
    );
  }

  approve() {
    this.status = VerificationStatus.APPROVED;
    this.reviewedAt = new Date();
    this.rejectionReason = null;
  }

  reject(reason: string) {
    this.status = VerificationStatus.REJECTED;
    this.reviewedAt = new Date();
    this.rejectionReason = reason;
  }
}
