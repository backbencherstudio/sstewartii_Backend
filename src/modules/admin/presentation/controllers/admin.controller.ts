import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Patch,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';

import { AdminVendorVerificationService } from '../../application/admin.service';
import { AdminCustomerService } from '../../application/admin.customer.service';

import { ApiOperation, ApiParam } from '@nestjs/swagger';

import {
  CustomerOrderHistoryQueryDto,
  CustomerReportQueueQueryDto,
} from '../dto/customer-query.dto';
import {
  VendorVerificationListQueryDto,
  AdminVendorVerificationDocumentType,
  AdminDashboardOverviewQueryDto,
  AdminDashboardRevenueQueryDto,
  AdminVendorAccountListQueryDto,
  AdminVendorAccountOverviewQueryDto,
  AdminVendorAccountOrdersQueryDto,
  UpdateVendorStatusDto,
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
  AdminVendorSubscriptionResponseDto,
  AdminVendorStatusResponseDto,
} from '../dto/admin.response.dto';
import {
  CustomerDetailResponseDto,
  CustomerReportQueueResponseDto,
  CustomerReportDetailResponseDto,
  CustomerVendorReportsResponseDto,
  CustomerVendorReportsResponseDto2,
} from '../dto/customer-detail.response.dto';

import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminVendorVerificationService,
    private readonly adminCustomerService: AdminCustomerService,
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

  @Patch('vendor-verifications/:verificationId/reject')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Vendor verification rejected successfully.')
  async rejectVendorVerification(
    @Param('verificationId') verificationId: string,
  ) {
    return this.service.rejectVendorVerification(verificationId);
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
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorDocuments(
    @Param('vendorId') vendorId: string,
  ): Promise<AdminVendorDocumentsResponseDto> {
    return this.service.getVendorDocuments(vendorId);
  }

  @Get('vendors/accounts/:vendorId/subscription')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorSubscription(
    @Param('vendorId') vendorId: string,
  ): Promise<AdminVendorSubscriptionResponseDto> {
    return this.service.getVendorSubscription(vendorId);
  }

  @Patch('vendors/:id/status')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Vendor status updated successfully.')
  updateVendorStatus(
    @Param('id') vendorId: string,
    @Body() dto: UpdateVendorStatusDto,
  ): Promise<AdminVendorStatusResponseDto> {
    return this.service.updateVendorStatus(vendorId, dto.status, dto.reason);
  }

  @Get('customer-list')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getCustomers(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.adminCustomerService.getCustomers({
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('customer/report')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Customer report queue fetched successfully')
  @ApiOperation({
    summary: 'Get reported customer queue with search, sort, pagination',
  })
  async getReportQueue(
    @Query() query: CustomerReportQueueQueryDto,
  ): Promise<CustomerReportQueueResponseDto> {
    return this.adminCustomerService.getReportQueue(query);
  }

  @Get('customer/:customerId')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Customer detail fetched successfully')
  @ApiOperation({ summary: 'Get customer detail with order history' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async getCustomerDetail(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerDetailResponseDto> {
    return this.adminCustomerService.getCustomerDetail(customerId, query);
  }

  @Get('customer/:customerId/reports')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Customer report details fetched successfully')
  @ApiOperation({
    summary: 'Get customer report details with vendor breakdown',
  })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async getCustomerReportDetail(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<CustomerReportDetailResponseDto> {
    return this.adminCustomerService.getCustomerReportDetail(customerId);
  }

  @Get('customer/:customerId/reports/vendors')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Customer vendor reports fetched successfully')
  @ApiOperation({
    summary: 'Get all vendor reports against a customer grouped by vendor',
  })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async getCustomerVendorReports(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<CustomerVendorReportsResponseDto> {
    return this.adminCustomerService.getCustomerVendorReports(customerId);
  }

  @Get('customers/:customerId/reports/vendors/:vendorId')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Customer vendor reports fetched successfully')
  @ApiOperation({
    summary: 'Get vendor reports against customer with reason and details',
  })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor UUID' })
  async getCustomerVendorReports2(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<CustomerVendorReportsResponseDto2> {
    return this.adminCustomerService.getCustomerVendorReports2(
      customerId,
      vendorId,
    );
  }

  @Patch('customer/:customerId/deactivate')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Customer deactivated successfully')
  @ApiOperation({ summary: 'Deactivate a customer account' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async deactivateCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<void> {
    return this.adminCustomerService.deactivateCustomer(customerId);
  }

  @Get('analytical-summary')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('Analytics summary fetched successfully')
  @ApiOperation({ summary: 'Get platform analytics summary stats' })
  async getAnalyticalSummary(@Query() query: AnalyticsQueryDto) {
    return this.service.getAnalyticalSummary(query);
  }
}
