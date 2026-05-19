import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminVendorVerificationService } from '../../application/admin.service';
import { VendorVerificationListQueryDto } from '../dto/admin.dto';
import { VendorVerificationManagementResponseDto } from '../dto/admin.response.dto';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';

@Controller('admin/vendor-verifications')
export class AdminVendorVerificationController {
  constructor(
    private readonly service: AdminVendorVerificationService,
  ) {}

  @Get()
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  async getVendorVerificationManagement(
    @Query() query: VendorVerificationListQueryDto,
  ): Promise<VendorVerificationManagementResponseDto> {
    return this.service.getManagementList(query);
  }
}