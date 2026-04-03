import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Req,
  UseGuards,
} from '@nestjs/common';

import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VendorVerificationService } from '../application/vendor.verification.service';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

interface AuthRequest extends Request {
   user: {
    id: string; 
  };
}

type VendorVerificationFiles = {
  businessLicense?: Express.Multer.File[];
  healthPermit?: Express.Multer.File[];
  insuranceProof?: Express.Multer.File[];
};

class VendorVerificationResponseDto {
  id: string;
  status: string;
  submittedAt: Date;
}

@Controller('vendor/verification')
export class VendorVerificationController {
  constructor(private readonly service: VendorVerificationService) {}

  @Post('upload-documents')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'businessLicense', maxCount: 1 },
      { name: 'healthPermit', maxCount: 1 },
      { name: 'insuranceProof', maxCount: 1 },
    ]),
  )
  async uploadDocuments(
    @Req() req: AuthRequest,
    @UploadedFiles() files: VendorVerificationFiles,
  ): Promise<VendorVerificationResponseDto> {

    const result = await this.service.uploadDocuments(
      req.user.id,
      files,
    );

   if (!result.submittedAt) {
      throw new Error('submittedAt is missing');
    }

    return {
      id: result.id,
      status: result.status,
      submittedAt: result.submittedAt,
    };
  }
}