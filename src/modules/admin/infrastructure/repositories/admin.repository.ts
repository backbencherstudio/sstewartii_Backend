import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';
import { VendorVerificationSort } from '../../presentation/dto/admin.dto';
import type {
  FindVendorVerificationsInput,
  IAdminVendorVerificationRepository,
  VendorVerificationListResult,
  VendorVerificationStatsResult,
} from '../../domain/interface/admin.repository.interface';

@Injectable()
export class AdminVendorVerificationRepository
  implements IAdminVendorVerificationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findManagementList(
    input: FindVendorVerificationsInput,
  ): Promise<VendorVerificationListResult> {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;

    const where = {
      ...(input.status && {
        status: input.status,
      }),
    };

    const orderBy =
      input.sort === VendorVerificationSort.OLDEST
        ? { submittedAt: 'asc' as const }
        : { submittedAt: 'desc' as const };

    const [total, items] = await Promise.all([
      this.prisma.vendorVerification.count({
        where,
      }),

      this.prisma.vendorVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          businessLicense: true,
          healthPermit: true,
          insuranceProof: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          rejectionReason: true,

          vendor: {
            select: {
              id: true,
              businessName: true,
              publicEmail: true,
              contactNumber: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      items,
    };
  }

  async getManagementStats(): Promise<VendorVerificationStatsResult> {
    const [
      totalPending,
      rejectedVerifications,
      totalVerifications,
      reviewedVerifications,
    ] = await Promise.all([
      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.PENDING,
        },
      }),

      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.REJECTED,
        },
      }),

      this.prisma.vendorVerification.count(),

      this.prisma.vendorVerification.findMany({
        where: {
          reviewedAt: {
            not: null,
          },
        },
        select: {
          submittedAt: true,
          reviewedAt: true,
        },
      }),
    ]);

    const totalReviewDays = reviewedVerifications.reduce(
      (sum, item) => {
        if (!item.reviewedAt) return sum;

        const diffMs =
          item.reviewedAt.getTime() - item.submittedAt.getTime();

        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        return sum + diffDays;
      },
      0,
    );

    const avgReviewTimeDays =
      reviewedVerifications.length > 0
        ? Number((totalReviewDays / reviewedVerifications.length).toFixed(1))
        : 0;

    const rejectionRate =
      totalVerifications > 0
        ? Number(
            ((rejectedVerifications / totalVerifications) * 100).toFixed(1),
          )
        : 0;

    return {
      totalPending,
      rejectedVerifications,
      avgReviewTimeDays,
      rejectionRate,
    };
  }

  async findDetailById(verificationId: string): Promise<any | null> {
    return this.prisma.vendorVerification.findUnique({
      where: {
        id: verificationId,
      },
      select: {
        id: true,
        businessLicense: true,
        healthPermit: true,
        insuranceProof: true,

        status: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,

        vendor: {
          select: {
            id: true,
            businessName: true,
            publicEmail: true,
            contactNumber: true,
            coverImage: true,
            createdAt: true,

            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }
}