import {
  Controller, 
  Req,
  Post, 
  Body, 
  Request, 
  UploadedFile, 
  UseInterceptors, 
  UseGuards, 
  Patch 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ProfileSetupFlowService } from '../application/profile.setup.service';
import { SetupProfileDto } from './dto/profile-setup-flow.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { 
  UpsertOperationHoursDto,
  ServiceAreaDto,
 } from './dto/profile-setup-flow.dto';
 
import { UpdateServiceAreaDto } from './dto/profile-setup-flow.dto';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorProfileSetupResponseDto } from './dto/profile-setup-flow.response.dto';

@ApiTags('vendor/profile-setup')
@Controller('vendor/profile-setup')
export class ProfileSetupFlowController {
  constructor(private readonly service: ProfileSetupFlowService) {}

  @Post('truck-profile-setup')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FileInterceptor('coverImage'))
  @ResponseMessage('Step 1: Profile details saved successfully')
  async setupStepOne(
    @Request() req: any,
    @Body() dto: SetupProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<VendorProfileSetupResponseDto> {
    return this.service.saveProfile(req.user.id, dto, file);
  }

  @Post('operation-hours')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Step 2: Operation Hours saved successfully')
  async setOperationHours(
    @Req() req: any,
    @Body() dto: UpsertOperationHoursDto,
  ): Promise<void> {
    const userId = req.user.id;

    return this.service.upsertOperationHours(userId, dto);
  }

  @Post('service-area')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Step 3: Service area saved successfully')
  async setServiceArea(
    @Req() req: any,
    @Body() dto: ServiceAreaDto,
  ) {
    const userId = req.user.id;

    return this.service.upsertServiceArea(userId, dto);
  }

  @Patch('update-service-area')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Service area updated successfully')
  @ApiOperation({ summary: 'Update Service Area' })
  @ApiResponse({ status: 201, description: 'Service area updated successfully' })
  async updateServiceArea(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateServiceAreaDto,
  ): Promise<void> {
    const userId = user.id;

    return this.service.updateServiceArea(userId, dto);
  }

}