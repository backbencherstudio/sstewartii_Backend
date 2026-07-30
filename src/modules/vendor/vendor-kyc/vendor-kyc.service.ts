import { PrismaService } from 'src/prisma/prisma.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  UploadNidDto,
  ListKycQueryDto,
  SelfieFiles,
} from './vendor-kyc.controller';
import { KycStatus, DocumentType, SelfiePose } from '@prisma/client';
import { IStorageService } from '@/common/storage/storage.interface';

// Maps multipart field name -> SelfiePose enum value
const SELFIE_FIELD_TO_POSE: Record<keyof SelfieFiles, SelfiePose> = {
  frontImage: SelfiePose.FRONT,
  leftImage: SelfiePose.LEFT,
  rightImage: SelfiePose.RIGHT,
  smileImage: SelfiePose.SMILE,
};

// Document types where the back-of-card image is required
const DOCUMENT_TYPES_REQUIRING_BACK: DocumentType[] = [
  DocumentType.NATIONAL_ID,
  DocumentType.DRIVERS_LICENSE,
];

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
    backFile?: Express.Multer.File,
  ) {
    const vendor = await this.assertEditable(userId);

    if (!dto.documentType) {
      throw new BadRequestException('documentType is required');
    }
    if (!dto.documentNumber) {
      throw new BadRequestException('documentNumber is required');
    }

    const backRequired = DOCUMENT_TYPES_REQUIRING_BACK.includes(
      dto.documentType,
    );
    if (backRequired && !backFile) {
      throw new BadRequestException(
        `backImage is required for documentType ${dto.documentType}`,
      );
    }

    const [frontImageUrl, backImageUrl] = await Promise.all([
      this.localStorageService.uploadFile(frontFile, 'kyc/nid'),
      backFile
        ? this.localStorageService.uploadFile(backFile, 'kyc/nid')
        : Promise.resolve(null),
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

  async uploadSelfie(userId: string, files: SelfieFiles) {
    const vendor = await this.assertEditable(userId);

    const profile = await this.prisma.kycProfile.findUnique({
      where: { vendorId: vendor.id },
      select: { id: true },
    });

    if (!profile) {
      throw new BadRequestException(
        'Upload NID document before uploading selfie',
      );
    }

    const entries = Object.entries(files) as [
      keyof SelfieFiles,
      Express.Multer.File[] | undefined,
    ][];

    const uploads = entries
      .filter(([, fileArr]) => !!fileArr?.[0])
      .map(async ([field, fileArr]) => {
        const pose = SELFIE_FIELD_TO_POSE[field];
        const imageUrl = await this.localStorageService.uploadFile(
          fileArr![0],
          `kyc/selfie/${pose.toLowerCase()}`,
        );
        return { pose, imageUrl };
      });

    const results = await Promise.all(uploads);

    // Upsert each pose independently so re-taking one shot doesn't
    // require re-uploading the others.
    await this.prisma.$transaction(
      results.map(({ pose, imageUrl }) =>
        this.prisma.kycSelfieImage.upsert({
          where: {
            kycProfileId_pose: { kycProfileId: profile.id, pose },
          },
          update: { imageUrl },
          create: { kycProfileId: profile.id, pose, imageUrl },
        }),
      ),
    );

    this.logger.log(
      `✅ Selfie pose(s) [${results.map((r) => r.pose).join(', ')}] uploaded for vendor ${vendor.id}`,
    );

    return {
      message: 'Selfie image(s) uploaded successfully',
      uploadedPoses: results.map((r) => r.pose),
    };
  }

  async submitForReview(userId: string) {
    const vendor = await this.assertEditable(userId);
    const vendorId = vendor.id;

    const profile = await this.prisma.kycProfile.findUnique({
      where: { vendorId },
      include: { selfieImages: true },
    });

    if (!profile) {
      throw new BadRequestException('Please upload your NID document first');
    }

    const backRequired = DOCUMENT_TYPES_REQUIRING_BACK.includes(
      profile.documentType,
    );

    if (!profile.frontImageUrl || (backRequired && !profile.backImageUrl)) {
      throw new BadRequestException(
        'Complete the NID document upload before submitting',
      );
    }

    const hasFrontSelfie = profile.selfieImages.some(
      (s) => s.pose === SelfiePose.FRONT,
    );
    if (!hasFrontSelfie) {
      throw new BadRequestException(
        'A front-facing selfie is required before submitting',
      );
    }

    await this.prisma.$transaction([
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: { kycStatus: KycStatus.PENDING_REVIEW, updatedAt: new Date() },
      }),
      this.prisma.kycProfile.update({
        where: { vendorId },
        data: { submittedAt: new Date() },
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
            documentType: true,
            documentNumber: true,
            frontImageUrl: true,
            backImageUrl: true,
            rejectionReason: true,
            submittedAt: true,
            reviewedAt: true,
            updatedAt: true,
            verifiedAt: true,
            selfieImages: {
              select: { pose: true, imageUrl: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return {
      kycStatus: vendor.kycStatus,
      steps: this.buildSteps(vendor.kycStatus, vendor.kycProfile),
      kycProfile: this.formatKycProfile(vendor.kycProfile),
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
      select: { id: true, kycStatus: true },
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

  private buildSteps(kycStatus: KycStatus, profile: any) {
    const backRequired = profile
      ? DOCUMENT_TYPES_REQUIRING_BACK.includes(profile.documentType)
      : false;

    const hasDocument = !!(
      profile?.frontImageUrl &&
      (!backRequired || profile?.backImageUrl)
    );
    const hasFrontSelfie = !!profile?.selfieImages?.some(
      (s: any) => s.pose === SelfiePose.FRONT,
    );

    return {
      documentUploaded: hasDocument,
      selfieUploaded: hasFrontSelfie,
      submittedForReview: kycStatus === KycStatus.PENDING_REVIEW,
      isApproved: kycStatus === KycStatus.APPROVED,
      isRejected: kycStatus === KycStatus.REJECTED,
    };
  }

  /**
   * Shapes the flat KycProfile + selfieImages relation into a
   * `document` block and a `selfie` block, and resolves full URLs.
   */
  private formatKycProfile(profile: any) {
    if (!profile) return null;

    const selfiePoses: SelfiePose[] = [
      SelfiePose.FRONT,
      SelfiePose.LEFT,
      SelfiePose.RIGHT,
      SelfiePose.SMILE,
    ];

    const selfieByPose = new Map(
      (profile.selfieImages ?? []).map((s: any) => [s.pose, s]),
    );

    return {
      document: {
        type: profile.documentType,
        documentNumber: profile.documentNumber,
        frontImageUrl: this.localStorageService.getFullUrl(
          profile.frontImageUrl,
        ),
        backImageUrl: profile.backImageUrl
          ? this.localStorageService.getFullUrl(profile.backImageUrl)
          : null,
      },
      selfie: {
        images: selfiePoses
          .filter((pose) => selfieByPose.has(pose))
          .map((pose) => {
            const s: any = selfieByPose.get(pose);
            return {
              pose,
              imageUrl: this.localStorageService.getFullUrl(s.imageUrl),
              uploadedAt: s.createdAt,
            };
          }),
      },
      rejectionReason: profile.rejectionReason,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      updatedAt: profile.updatedAt,
      verifiedAt: profile.verifiedAt,
    };
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
          owner: { select: { id: true, name: true, email: true } },
          kycProfile: {
            select: {
              documentType: true,
              documentNumber: true,
              frontImageUrl: true,
              backImageUrl: true,
              submittedAt: true,
              reviewedAt: true,
              rejectionReason: true,
              verifiedAt: true,
              selfieImages: {
                select: { pose: true, imageUrl: true, createdAt: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    const data = items.map((vendor) => ({
      ...vendor,
      coverImage: this.localStorageService.getFullUrl(vendor.coverImage),
      kycProfile: this.formatKycProfile(vendor.kycProfile),
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
          select: { id: true, name: true, email: true, createdAt: true },
        },
        kycProfile: {
          select: {
            documentType: true,
            documentNumber: true,
            frontImageUrl: true,
            backImageUrl: true,
            submittedAt: true,
            reviewedAt: true,
            reviewedByAdminId: true,
            rejectionReason: true,
            updatedAt: true,
            verifiedAt: true,
            selfieImages: {
              select: { pose: true, imageUrl: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return {
      ...vendor,
      coverImage: this.localStorageService.getFullUrl(vendor.coverImage),
      kycProfile: this.formatKycProfile(vendor.kycProfile),
    };
  }

  async approve(vendorId: string, adminId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        kycStatus: true,
        kycProfile: { select: { id: true } },
      },
    });

    if (!vendor) throw new NotFoundException('Vendor not found');
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
        data: { kycStatus: KycStatus.APPROVED, updatedAt: new Date() },
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
        kycProfile: { select: { id: true } },
      },
    });

    if (!vendor) throw new NotFoundException('Vendor not found');
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
        data: { kycStatus: KycStatus.REJECTED, updatedAt: new Date() },
      }),
      this.prisma.kycSelfieImage.deleteMany({
        where: { kycProfileId: vendor.kycProfile.id },
      }),
      this.prisma.kycProfile.update({
        where: { vendorId },
        data: {
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          rejectionReason,
          frontImageUrl: null,
          backImageUrl: null,
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
      this.prisma.vendor.count({
        where: { kycStatus: KycStatus.UNVERIFIED },
      }),
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
