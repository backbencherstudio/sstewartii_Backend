import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';

import { AdminVendorVerificationService } from '../../application/admin.service';
import { 
  VendorVerificationListQueryDto,
  AdminVendorVerificationDocumentType,
  AdminDashboardOverviewQueryDto,
  AdminDashboardRevenueQueryDto,
  AdminVendorAccountListQueryDto,
  AdminVendorAccountOverviewQueryDto,
  AdminVendorAccountOrdersQueryDto,
 } from '../dto/admin.dto';
import { 
  VendorVerificationManagementResponseDto,
  AdminVendorVerificationDetailResponseDto,
  AdminVendorVerificationFileResponseDto,
  AdminDashboardOverviewResponseDto,
  AdminDashboardRevenueResponseDto,
  AdminVendorAccountListResponseDto,
  AdminVendorAccountOverviewResponseDto,
  AdminVendorAccountOrdersResponseDto,
  AdminVendorDocumentsResponseDto,
} from '../dto/admin.response.dto';

import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';

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
  ): Promise<VendorVerificationManagementResponseDto> {
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

  @Get('dashboard/revenue')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getRevenueChart(
    @Query() query: AdminDashboardRevenueQueryDto,
  ): Promise<AdminDashboardRevenueResponseDto> {
    return this.service.getRevenueChart(query);
  }

  @Patch('vendor-verifications/:verificationId/approve')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Vendor verification approved successfully.')
  async approveVendorVerification(
    @Param('verificationId') verificationId: string,
  ) {
    return this.service.approveVendorVerification(verificationId);
  }

  @Get('vendors/accounts')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorAccounts(
    @Query() query: AdminVendorAccountListQueryDto,
  ): Promise<AdminVendorAccountListResponseDto> {
    return this.service.getVendorAccounts(query);
  } 

  @Get('vendors/:vendorId/overview')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorOverview(
    @Param('vendorId') vendorId: string,
    @Query() query: AdminVendorAccountOverviewQueryDto,
  ): Promise<AdminVendorAccountOverviewResponseDto> {
    return this.service.getVendorOverview(vendorId, query);
  }

  @Get('vendors/accounts/:vendorId/orders')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorAccountOrders(
    @Param('vendorId') vendorId: string,
    @Query() query: AdminVendorAccountOrdersQueryDto,
  ): Promise<AdminVendorAccountOrdersResponseDto> {
    return this.service.getVendorAccountOrders(vendorId, query);
  }

  @Get('vendors/accounts/:vendorId/documents')
  async getVendorDocuments(
    @Param('vendorId') vendorId: string,
  ): Promise<AdminVendorDocumentsResponseDto> {
    return this.service.getVendorDocuments(
      vendorId,
    );
  }
} 