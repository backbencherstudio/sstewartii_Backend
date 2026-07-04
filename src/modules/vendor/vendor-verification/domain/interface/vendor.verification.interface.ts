import { VendorVerification } from '../entities/vendor-verification.entity';
import { VerificationStatus } from '@prisma/client';

export interface IVendorVerificationRepository {
  findByVendorId(vendorId: string): Promise<VendorVerification | null>;

  upsert(data: VendorVerification): Promise<VendorVerification>;

  updateStatus(
    vendorId: string,
    status: VerificationStatus,
    reason?: string,
  ): Promise<void>;
}
