import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';

import { AdminVendorVerificationService } from '../../application/admin.service';
import { VendorVerificationListQueryDto } from '../dto/admin.dto';
import { 
  VendorVerificationManagementResponseDto,
  AdminVendorVerificationDetailResponseDto,
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
}