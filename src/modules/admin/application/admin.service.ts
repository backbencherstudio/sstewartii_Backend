import { 
  Inject, 
  Injectable,
  NotFoundException,
 } from '@nestjs/common';
import type { IAdminVendorVerificationRepository } from '../domain/interface/admin.repository.interface';
import { 
  VendorVerificationListQueryDto,
  VendorVerificationSort,
  AdminVendorVerificationDocumentType,
  AdminDashboardOverviewQueryDto,
  ,
 } from '../presentation/dto/admin.dto';
import { 
  VendorVerificationManagementResponseDto,
  AdminVendorVerificationDetailResponseDto,
  AdminVendorVerificationFileResponseDto,
  AdminDashboardOverviewResponseDto,
 } from '../presentation/dto/admin.response.dto';
import { AdminMapper } from '../infrastructure/mapper/admin.mapper';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class AdminVendorVerificationService {
  constructor(
    @Inject('IAdminVendorVerificationRepository')
    private readonly repository: IAdminVendorVerificationRepository,
    private readonly adminMapper: AdminMapper,
  ) {}

  async getManagementList(
    query: VendorVerificationListQueryDto,
  ): Promise<VendorVerificationManagementResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status ?? VerificationStatus.PENDING;
    const sort = query.sort ?? VendorVerificationSort.NEWEST;

    const [stats, result] = await Promise.all([
      this.repository.getManagementStats(),
      this.repository.findManagementList({
        status,
        page,
        limit,
        sort,
      }),
    ]);

    return this.adminMapper.toManagementResponse({
      stats,
      result,
      page,
      limit,
    });
  }

  async getVerificationDetail(
    verificationId: string,
  ): Promise<AdminVendorVerificationDetailResponseDto> {
    const verification =
      await this.repository.findDetailById(verificationId);

    if (!verification) {
      throw new NotFoundException('Vendor verification not found');
    }

    return this.adminMapper.toDetailResponse(verification);
  }

  async getVerificationDocumentFile(
    verificationId: string,
    documentType: AdminVendorVerificationDocumentType,
  ): Promise<AdminVendorVerificationFileResponseDto> {
    const verification =
      await this.repository.findDocumentFileByVerificationId(verificationId);

    if (!verification) {
      throw new NotFoundException('Vendor verification not found');
    }

    return this.adminMapper.toFileResponse({
      verification,
      documentType,
    });
  }

    async getOverview(
      query: AdminDashboardOverviewQueryDto,
    ): Promise<AdminDashboardOverviewResponseDto> {
    
      void query;

      const overview = await this.repository.getOverview();

      return this.adminMapper.toOverviewResponse(overview);
    }
}