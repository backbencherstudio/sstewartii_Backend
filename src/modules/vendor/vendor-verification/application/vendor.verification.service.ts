import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import type { IVendorVerificationRepository } from '../domain/interface/vendor.verification.interface';
import { VendorVerification } from '../domain/entities/vendor-verification.entity';
import type { IStorageService } from 'src/common/storage/storage.interface';
import type { IVendorRepository } from '../../vendor/domain/interface/vendor.repository.interface';

@Injectable()
export class VendorVerificationService {
  constructor(
    @Inject('IVendorVerificationRepository')
    private readonly repo: IVendorVerificationRepository,

    @Inject('IVendorRepository')
    private readonly vendorRepo: IVendorRepository,

    @Inject('IStorageService')
    private readonly storage: IStorageService,
  ) {}

  async uploadDocuments(
    userId: string,
    files: {
      businessLicense?: Express.Multer.File[];
      healthPermit?: Express.Multer.File[];
      insuranceProof?: Express.Multer.File[];
    },
  ): Promise<VendorVerification> {
    if (
      !files.businessLicense ||
      !files.healthPermit ||
      !files.insuranceProof
    ) {
      throw new BadRequestException('All documents are required');
    }

    const vendor = await this.vendorRepo.findByOwnerId(userId);

    if (!vendor) {
      throw new BadRequestException('Vendor profile not found');
    }

    const vendorId = vendor.id;

    const existing = await this.repo.findByVendorId(vendorId);

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new BadRequestException('Verification already under review');
      }

      if (existing.status === 'APPROVED') {
        throw new BadRequestException('Vendor already verified');
      }

      // REJECTED → allow resubmission
    }

    const folder = `vendor/vendor-verification/${vendorId}`;

    const [businessLicenseUrl, healthPermitUrl, insuranceProofUrl] =
      await Promise.all([
        this.storage.uploadFile(files.businessLicense[0], folder),
        this.storage.uploadFile(files.healthPermit[0], folder),
        this.storage.uploadFile(files.insuranceProof[0], folder),
      ]);

    const verification = VendorVerification.createPending(
      vendorId,
      businessLicenseUrl,
      healthPermitUrl,
      insuranceProofUrl,
    );

    return await this.repo.upsert(verification);
  }
}
