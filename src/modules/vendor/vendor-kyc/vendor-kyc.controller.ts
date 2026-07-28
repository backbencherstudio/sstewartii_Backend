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
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
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


// Replace these with your actual guards/decorators

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

// ============================================
// VENDOR-FACING CONTROLLER
// (mobile app: upload NID, upload selfie, submit, check status)
// ============================================

@UseGuards(RoleGuard)
@Roles(Role.VENDOR)
@Controller('vendor/kyc')
export class VendorKycController {
  constructor(private readonly vendorKycService: VendorKycService) {}

  /**
   * Step 1: upload NID front + back in one call
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
    if (!files?.frontImage?.[0] || !files?.backImage?.[0]) {
      throw new BadRequestException(
        'Both frontImage and backImage files are required',
      );
    }

    return this.vendorKycService.uploadDocument(
      user.id,
      dto,
      files.frontImage[0],
      files.backImage[0],
    );
  }

  /**
   * Step 2: upload the final selfie frame captured after
   * the Flutter liveness check (turn left/right, blink, smile) passes
   */
  @Post('selfie')
  @UseInterceptors(FileInterceptor('selfieImage'))
  uploadSelfie(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('selfieImage file is required');
    }
    return this.vendorKycService.uploadSelfie(user.id, file);
  }

  /**
   * Step 3: submit for manual admin review
   * (only allowed once NID + selfie are both uploaded)
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
   * (vendor info + NID front/back + selfie)
   */
  @Get(':vendorId')
  getDetail(@Param('vendorId') vendorId: string) {
    return this.vendorKycService.getDetailForAdmin(vendorId);
  }

  @Patch(':vendorId/approve')
  approve(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: AuthUser,
  ) {
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
