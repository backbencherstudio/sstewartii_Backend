import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Get,
  Param,
  Query,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';

import { 
  CreateVendorTruckReviewDto,
  VendorTruckReviewsQueryDto,
 } from '../dto/review.dto';
import { 
  CreateVendorTruckReviewResponseDto,
  VendorTruckReviewTagListResponseDto,
  VendorTruckReviewsResponseDto,
} from '../dto/review.response.dto';

import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ReviewService } from '../../application/review.service';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get(':vendorId')
  async getVendorTruckReviews(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorTruckReviewsQueryDto,
  ): Promise<VendorTruckReviewsResponseDto> {
    return this.reviewService.getVendorTruckReviews(vendorId, query);
  }

  @Post('create-truck-review')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ResponseMessage('Truck review submitted successfully.')
  async createVendorTruckReview(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVendorTruckReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CreateVendorTruckReviewResponseDto> {
    return this.reviewService.createVendorTruckReview(user.id, dto, files);
  }

  @Get('tags')
  async getReviewTags(): Promise<VendorTruckReviewTagListResponseDto> {
    return this.reviewService.getReviewTags();
  }
}