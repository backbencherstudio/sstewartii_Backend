import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { IVendorVerificationRepository } from '../../domain/interface/vendor.verification.interface';
import { VendorVerification } from '../../domain/entities/vendor-verification.entity';
import { VendorVerificationMapper } from '../mapper/vendor.verification.mapper';
import { VerificationStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

type VendorVerificationRecord = Prisma.VendorVerificationGetPayload<{}>;

@Injectable()
export class VendorVerificationRepository
  implements IVendorVerificationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findByVendorId(
    vendorId: string,
  ): Promise<VendorVerification | null> {
    const record: VendorVerificationRecord | null =
      await this.prisma.vendorVerification.findUnique({
        where: { vendorId },
      });

    if (!record) return null;

    return VendorVerificationMapper.toDomain(record);
  }

  async upsert(
    data: VendorVerification,
  ): Promise<VendorVerification> {
    
    const saved = await this.prisma.vendorVerification.upsert({
      where: { vendorId: data.vendorId },

      update: {
        businessLicense: data.businessLicense,
        healthPermit: data.healthPermit,
        insuranceProof: data.insuranceProof,

        status: VerificationStatus.PENDING,
        rejectionReason: null,

        submittedAt: new Date(),
        reviewedAt: null,

        version: {
          increment: 1,
        },
      },

      create: {
        id: data.id,
        vendorId: data.vendorId,

        businessLicense: data.businessLicense,
        healthPermit: data.healthPermit,
        insuranceProof: data.insuranceProof,

        status: VerificationStatus.PENDING,
        rejectionReason: null,
        submittedAt: data.submittedAt ?? new Date(),

        version: 1,
      },
    });

    return VendorVerificationMapper.toDomain(saved);
  }

  async updateStatus(
    vendorId: string,
    status: VerificationStatus,
    reason?: string,
  ): Promise<void> {
    await this.prisma.vendorVerification.update({
      where: { vendorId },
      data: {
        status,

        rejectionReason:
          status === VerificationStatus.REJECTED
            ? reason ?? 'Rejected by admin'
            : null,

        reviewedAt: new Date(),
      },
    });
  }
}