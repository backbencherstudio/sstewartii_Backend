import { Controller, Req, Post, Body, Request, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileSetupFlowService } from '../application/profile.setup.service';
import { SetupProfileDto } from './dto/profile-setup-flow.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { OperationHourDto } from './dto/profile-setup-flow.dto';

@Controller('vendor/profile-setup')
export class ProfileSetupFlowController {
  constructor(private readonly service: ProfileSetupFlowService) {}

  @Post('upload-cover-photo')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FileInterceptor('coverImage'))
  @ResponseMessage('Step 1: Profile details saved successfully')
  async setupStepOne(
    @Request() req: any,
    @Body() dto: SetupProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<void> {
    
    return this.service.saveProfile(req.user.id, dto, file);
  }

  @Post('operation-hours')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async setOperationHours(
    @Req() req: any,
    @Body() dto: OperationHourDto[],
  ): Promise<void> {
    const userId = req.user.id;

    return this.service.saveOperationHours(userId, dto);
  }
}