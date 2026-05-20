import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';

import { AdminVendorVerificationService } from '../../application/admin.service';
import { 
  VendorVerificationListQueryDto,
  AdminVendorVerificationDocumentType,
  AdminDashboardOverviewQueryDto,
  AdminDashboardRevenueQueryDto,
 } from '../dto/admin.dto';
import { 
  VendorVerificationManagementResponseDto,
  AdminVendorVerificationDetailResponseDto,
  AdminVendorVerificationFileResponseDto,
  AdminDashboardOverviewResponseDto,
  AdminDashboardRevenueResponseDto,
} from '../dto/admin.response.dto';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminVendorVerificationService,
  ) {}

  @Get('vendor-verifications')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorVerificationManagement(
    @Query() query: VendorVerificationListQueryDto,
  ): Promise<VendorVerificationManagementResponseDto>   {
    return this.service.getManagementList(query);
  }

  @Get('vendor-verifications/:verificationId')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorVerificationDetail(
    @Param('verificationId') verificationId: string,
  ): Promise<AdminVendorVerificationDetailResponseDto> {
    return this.service.getVerificationDetail(verificationId);
  }

  @Get('vendor-verifications/:verificationId/documents/:documentType')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorVerificationDocumentFile(
    @Param('verificationId') verificationId: string,
    @Param('documentType') documentType: AdminVendorVerificationDocumentType,
  ): Promise<AdminVendorVerificationFileResponseDto> {
    return this.service.getVerificationDocumentFile(
      verificationId,
      documentType,
    );
  }

  @Get('dashboard/overview')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getOverview(
    @Query() query: AdminDashboardOverviewQueryDto,
  ): Promise<AdminDashboardOverviewResponseDto> {
    return this.service.getOverview(query);
  }

  //Get revenue
  @Get('revenue')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getRevenueChart(
    @Query() query: AdminDashboardRevenueQueryDto,
  ): Promise<AdminDashboardRevenueResponseDto> {
    return this.service.getRevenueChart(query);
  }
}