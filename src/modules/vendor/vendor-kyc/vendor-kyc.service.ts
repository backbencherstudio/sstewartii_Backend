import { PrismaService } from 'src/prisma/prisma.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { UploadNidDto, ListKycQueryDto } from './vendor-kyc.controller';
import { KycStatus } from '@prisma/client';
import { IStorageService } from '@/common/storage/storage.interface';

@Injectable()
export class VendorKycService {
  private readonly logger = new Logger(VendorKycService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IStorageService')
    private readonly localStorageService: IStorageService,
  ) {}

  // ============================================
  // VENDOR-FACING METHODS
  // ============================================

  async uploadDocument(
    userId: string,
    dto: UploadNidDto,
    frontFile: Express.Multer.File,
    backFile: Express.Multer.File,
  ) {
    const vendor = await this.assertEditable(userId);

    if (!dto.documentType) {
      throw new BadRequestException('documentType is required');
    }

    if (!dto.documentNumber) {
      throw new BadRequestException('documentNumber is required');
    }

    const [frontImageUrl, backImageUrl] = await Promise.all([
      this.localStorageService.uploadFile(frontFile, 'kyc/nid'),
      this.localStorageService.uploadFile(backFile, 'kyc/nid'),
    ]);

    await this.prisma.kycProfile.upsert({
      where: { vendorId: vendor.id },
      update: {
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        frontImageUrl,
        backImageUrl,
        rejectionReason: null,
        reviewedByAdminId: null,
        reviewedAt: null,
        verifiedAt: null,
      },
      create: {
        vendorId: vendor.id,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        frontImageUrl,
        backImageUrl,
      },
    });

    this.logger.log(`✅ NID uploaded for vendor ${vendor.id}`);

    return { message: 'NID document uploaded successfully' };
  }

  async uploadSelfie(userId: string, file: Express.Multer.File) {
    const vendor = await this.assertEditable(userId);

    const profile = await this.prisma.kycProfile.findUnique({
      where: { vendorId: vendor.id },
    });

    if (!profile) {
      throw new BadRequestException(
        'Upload NID document before uploading selfie',
      );
    }

    const selfieImageUrl = await this.localStorageService.uploadFile(
      file,
      'kyc/selfie',
    );

    await this.prisma.kycProfile.update({
      where: { vendorId: vendor.id },
      data: { selfieImageUrl },
    });

    this.logger.log(`✅ Selfie uploaded for vendor ${vendor.id}`);

    return { message: 'Selfie uploaded successfully' };
  }

  async submitForReview(userId: string) {
    const vendor = await this.assertEditable(userId);
    const vendorId = vendor.id;

    const profile = await this.prisma.kycProfile.findUnique({
      where: { vendorId },
    });

    if (!profile) {
      throw new BadRequestException('Please upload your NID document first');
    }

    if (
      !profile.frontImageUrl ||
      !profile.backImageUrl ||
      !profile.selfieImageUrl
    ) {
      throw new BadRequestException(
        'Complete NID (front + back) and selfie upload before submitting',
      );
    }

    await this.prisma.$transaction([
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          kycStatus: KycStatus.PENDING_REVIEW,
          updatedAt: new Date(),
        },
      }),
      this.prisma.kycProfile.update({
        where: { vendorId },
        data: {
          submittedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`📤 Vendor ${vendorId} submitted KYC for review`);

    return { message: 'Submitted for review' };
  }

  async getStatus(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        kycStatus: true,
        kycProfile: {
          select: {
            frontImageUrl: true,
            backImageUrl: true,
            selfieImageUrl: true,
            rejectionReason: true,
            reviewedAt: true,
            documentType: true,
            documentNumber: true,
            submittedAt: true,
            updatedAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const profile = vendor.kycProfile;

    const frontImageUrl = this.localStorageService.getFullUrl(
      profile?.frontImageUrl as string,
    );
    const backImageUrl = this.localStorageService.getFullUrl(
      profile?.backImageUrl as string,
    );
    const selfieImageUrl = this.localStorageService.getFullUrl(
      profile?.selfieImageUrl as string,
    );

    const hasNid = !!(profile?.frontImageUrl && profile?.backImageUrl);
    const hasSelfie = !!profile?.selfieImageUrl;

    return {
      kycStatus: vendor.kycStatus,
      steps: {
        nidUploaded: hasNid,
        selfieUploaded: hasSelfie,
        submittedForReview: vendor.kycStatus === KycStatus.PENDING_REVIEW,
        isApproved: vendor.kycStatus === KycStatus.APPROVED,
        isRejected: vendor.kycStatus === KycStatus.REJECTED,
      },
      kycProfile: profile
        ? {
            frontImageUrl,
            backImageUrl,
            selfieImageUrl,
            documentType: profile.documentType,
            documentNumber: profile.documentNumber,
            rejectionReason: profile.rejectionReason,
            submittedAt: profile.submittedAt,
            reviewedAt: profile.reviewedAt,
            updatedAt: profile.updatedAt,
            verifiedAt: profile.verifiedAt,
          }
        : null,
    };
  }

  /**
   * Prevents editing NID/selfie while a review is already in progress.
   * Vendors can (re)upload when UNVERIFIED or REJECTED, but not while
   * PENDING_REVIEW or already APPROVED.
   */
  private async assertEditable(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        kycStatus: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    if (vendor.kycStatus === KycStatus.PENDING_REVIEW) {
      throw new ConflictException(
        'Your verification is already pending review',
      );
    }

    if (vendor.kycStatus === KycStatus.APPROVED) {
      throw new ConflictException('Your account is already verified');
    }

    return vendor;
  }

  // ============================================
  // ADMIN-FACING METHODS
  // ============================================

  async listForAdmin(query: ListKycQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = {
      kycStatus: query.status ? query.status : KycStatus.PENDING_REVIEW,
    };

    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { vendorCode: { contains: query.search, mode: 'insensitive' } },
        {
          owner: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,
        select: {
          id: true,
          vendorCode: true,
          businessName: true,
          publicEmail: true,
          contactNumber: true,
          coverImage: true,
          kycStatus: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          kycProfile: {
            select: {
              documentType: true,
              documentNumber: true,
              frontImageUrl: true,
              backImageUrl: true,
              selfieImageUrl: true,
              submittedAt: true,
              reviewedAt: true,
              rejectionReason: true,
              verifiedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Resolve full URLs for images
    const data = items.map((vendor) => ({
      ...vendor,
      coverImage: this.localStorageService.getFullUrl(vendor.coverImage),
      kycProfile: vendor.kycProfile
        ? {
            ...vendor.kycProfile,
            frontImageUrl: this.localStorageService.getFullUrl(
              vendor.kycProfile.frontImageUrl,
            ),
            backImageUrl: this.localStorageService.getFullUrl(
              vendor.kycProfile.backImageUrl,
            ),
            selfieImageUrl: this.localStorageService.getFullUrl(
              vendor.kycProfile.selfieImageUrl,
            ),
          }
        : null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDetailForAdmin(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        vendorCode: true,
        businessName: true,
        publicEmail: true,
        contactNumber: true,
        coverImage: true,
        kycStatus: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        kycProfile: {
          select: {
            documentType: true,
            documentNumber: true,
            frontImageUrl: true,
            backImageUrl: true,
            selfieImageUrl: true,
            submittedAt: true,
            reviewedAt: true,
            reviewedByAdminId: true,
            rejectionReason: true,
            updatedAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Resolve relative storage paths to full URLs for the dashboard
    const coverImage = this.localStorageService.getFullUrl(vendor.coverImage);

    const kycProfile = vendor.kycProfile
      ? {
          ...vendor.kycProfile,
          frontImageUrl: this.localStorageService.getFullUrl(
            vendor.kycProfile.frontImageUrl,
          ),
          backImageUrl: this.localStorageService.getFullUrl(
            vendor.kycProfile.backImageUrl,
          ),
          selfieImageUrl: this.localStorageService.getFullUrl(
            vendor.kycProfile.selfieImageUrl,
          ),
        }
      : null;

    return {
      ...vendor,
      coverImage,
      kycProfile,
    };
  }

  async approve(vendorId: string, adminId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        kycStatus: true,
        kycProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.kycStatus !== KycStatus.PENDING_REVIEW) {
      throw new ConflictException(
        'Only vendors with PENDING_REVIEW status can be approved',
      );
    }

    if (!vendor.kycProfile) {
      throw new BadRequestException('Vendor has no KYC profile to approve');
    }

    await this.prisma.$transaction([
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          kycStatus: KycStatus.APPROVED,
          updatedAt: new Date(),
        },
      }),
      this.prisma.kycProfile.update({
        where: { vendorId },
        data: {
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          verifiedAt: new Date(),
          rejectionReason: null,
        },
      }),
    ]);

    this.logger.log(`✅ Vendor ${vendorId} KYC approved by admin ${adminId}`);

    // TODO: enqueue a NotificationLog + push notification to the vendor here

    return {
      message: 'Vendor KYC approved successfully',
      vendorId,
      status: KycStatus.APPROVED,
    };
  }

  async reject(vendorId: string, adminId: string, reason?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        kycStatus: true,
        kycProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.kycStatus !== KycStatus.PENDING_REVIEW) {
      throw new ConflictException(
        'Only vendors with PENDING_REVIEW status can be rejected',
      );
    }

    if (!vendor.kycProfile) {
      throw new BadRequestException('Vendor has no KYC profile to reject');
    }

    const rejectionReason =
      reason || 'KYC verification failed. Please review and resubmit.';

    await this.prisma.$transaction([
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          kycStatus: KycStatus.REJECTED,
          updatedAt: new Date(),
        },
      }),
      this.prisma.kycProfile.update({
        where: { vendorId },
        data: {
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason,
          // Clear uploaded files so the vendor re-submits cleanly
          frontImageUrl: null,
          backImageUrl: null,
          selfieImageUrl: null,
          verifiedAt: null,
        },
      }),
    ]);

    this.logger.log(`❌ Vendor ${vendorId} KYC rejected by admin ${adminId}`);

    // TODO: enqueue a NotificationLog + push notification to the vendor here

    return {
      message: 'Vendor KYC rejected successfully',
      vendorId,
      status: KycStatus.REJECTED,
      reason: rejectionReason,
    };
  }

  async getStatsForAdmin() {
    const [total, pending, approved, rejected, unverified] = await Promise.all([
      this.prisma.vendor.count(),
      this.prisma.vendor.count({
        where: { kycStatus: KycStatus.PENDING_REVIEW },
      }),
      this.prisma.vendor.count({ where: { kycStatus: KycStatus.APPROVED } }),
      this.prisma.vendor.count({ where: { kycStatus: KycStatus.REJECTED } }),
      this.prisma.vendor.count({ where: { kycStatus: KycStatus.UNVERIFIED } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      unverified,
      completionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }
}
