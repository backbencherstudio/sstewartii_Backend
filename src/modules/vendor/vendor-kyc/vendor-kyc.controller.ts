import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';
import { VendorKycService } from './vendor-kyc.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import { Role } from '@/common/enums/role.enum';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';

// ============================================
// DTOs
// ============================================

export class UploadNidDto {
  @IsEnum(DocumentType)
  documentType: DocumentType | undefined;

  @IsString()
  @IsNotEmpty()
  documentNumber: string | undefined;
}

export class RejectKycDto {
  @IsString()
  @IsNotEmpty()
  reason: string | undefined;
}

export class ListKycQueryDto {
  @IsOptional()
  @IsString()
  status?: 'UNVERIFIED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

// Field names accepted in the multipart selfie upload.
// FRONT is mandatory; LEFT/RIGHT/SMILE are optional liveness frames.
export const SELFIE_FIELDS = [
  { name: 'frontImage', maxCount: 1 },
  { name: 'leftImage', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 },
  { name: 'smileImage', maxCount: 1 },
];

export type SelfieFiles = {
  frontImage?: Express.Multer.File[];
  leftImage?: Express.Multer.File[];
  rightImage?: Express.Multer.File[];
  smileImage?: Express.Multer.File[];
};

// ============================================
// VENDOR-FACING CONTROLLER
// (mobile app: upload NID, upload selfie poses, submit, check status)
// ============================================

@UseGuards(RoleGuard)
@Roles(Role.VENDOR)
@Controller('vendor/kyc')
export class VendorKycController {
  constructor(private readonly vendorKycService: VendorKycService) {}

  /**
   * Step 1: upload NID front (+ back, depending on documentType) in one call
   */
  @Post('document')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'frontImage', maxCount: 1 },
      { name: 'backImage', maxCount: 1 },
    ]),
  )
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
    @Body() dto: UploadNidDto,
  ) {
    if (!files?.frontImage?.[0]) {
      throw new BadRequestException('frontImage file is required');
    }

    return this.vendorKycService.uploadDocument(
      user.id,
      dto,
      files.frontImage[0],
      files.backImage?.[0],
    );
  }

  /**
   * Step 2: upload liveness selfie frames captured after the Flutter
   * gesture check (turn left/right, blink, smile) passes.
   * frontImage is required; leftImage/rightImage/smileImage are optional.
   * Can be called multiple times — each pose overwrites the previous one.
   */
  @Post('selfie')
  @UseInterceptors(FileFieldsInterceptor(SELFIE_FIELDS))
  uploadSelfie(
    @CurrentUser() user: AuthUser,
    @UploadedFiles() files: SelfieFiles,
  ) {
    if (
      !files?.frontImage?.[0] &&
      !files?.leftImage?.[0] &&
      !files?.rightImage?.[0] &&
      !files?.smileImage?.[0]
    ) {
      throw new BadRequestException(
        'At least one selfie image (frontImage/leftImage/rightImage/smileImage) is required',
      );
    }

    return this.vendorKycService.uploadSelfie(user.id, files);
  }

  /**
   * Step 3: submit for manual admin review
   * (only allowed once NID + at least the front selfie are uploaded)
   */
  @Post('submit')
  submit(@CurrentUser() user: AuthUser) {
    return this.vendorKycService.submitForReview(user.id);
  }

  /**
   * Vendor checks their own current KYC status / rejection reason
   */
  @Get('status')
  getStatus(@CurrentUser() user: AuthUser) {
    return this.vendorKycService.getStatus(user.id);
  }
}

// ============================================
// ADMIN-FACING CONTROLLER
// (dashboard: list, view detail, approve, reject)
// ============================================

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN')
@Controller('admin/vendors/verification')
export class AdminVendorKycController {
  constructor(private readonly vendorKycService: VendorKycService) {}

  /**
   * List vendors for the "Manage Verification" table
   * Defaults to PENDING_REVIEW if no status filter given
   */
  @Get()
  list(@Query() query: ListKycQueryDto) {
    return this.vendorKycService.listForAdmin(query);
  }

  /**
   * Full detail for the "Reviewing documents" screen
   * (vendor info + document images + selfie poses)
   */
  @Get(':vendorId')
  getDetail(@Param('vendorId') vendorId: string) {
    return this.vendorKycService.getDetailForAdmin(vendorId);
  }

  @Patch(':vendorId/approve')
  approve(@Param('vendorId') vendorId: string, @CurrentUser() user: AuthUser) {
    return this.vendorKycService.approve(vendorId, user.id);
  }

  @Patch(':vendorId/reject')
  reject(
    @Param('vendorId') vendorId: string,
    @Body() dto: RejectKycDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vendorKycService.reject(vendorId, user.id, dto.reason);
  }
}
