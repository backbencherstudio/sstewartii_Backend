import { 
  Controller,
  Get,
  Req,
  Param, 
  Query,
  Post,
  UseGuards,
  UseInterceptors,
  Body,
  UploadedFiles,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';

import { 
  VendorMenuQueryDto,
  UploadTruckGalleryDto,
  VendorReviewsQueryDto,
 } from '../dto/vendor.dto';

import { 
  VendorMenuResponseDto,
  VendorInfoResponseDto,
  UploadTruckGalleryResponseDto,
  TruckGalleryResponseDto,
  VendorReviewsResponseDto,
 } from '../dto/vendor.response.dto';

import { VendorService } from '../../application/vendor.service';

import { Public } from 'src/common/decorators/public.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { Role } from 'src/common/enums/role.enum';

import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';

@Controller('vendor')
export class VendorController {
  constructor(
    private readonly VendorService: VendorService
  ) {}

  @Get('me')
  async getMyVendor(@Req() req: any) {
    const userId = req.user.sub;  
    return this.VendorService.execute(userId);
  }

  @Public()
  @Get(':vendorId/menu')
  async getVendorMenu(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorMenuQueryDto,
  ): Promise<VendorMenuResponseDto> {
    return this.VendorService.getVendorMenu(vendorId, query);
  }

  // @Public()
  // @Get(':vendorId/info')
  // async getVendorInfo(
  //   @Param('vendorId') vendorId: string,
  // ): Promise<VendorInfoResponseDto> {
  //   return this.VendorService.getVendorInfo(vendorId);
  // }

  @Post('truck-gallery/upload')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ResponseMessage('Truck gallery images uploaded successfully.')
  async uploadTruckGallery(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadTruckGalleryDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadTruckGalleryResponseDto> {
    return this.VendorService.uploadTruckGalleryImages(user.id, dto, files);
  }

  // @Public()
  // @Get(':vendorId/truck-gallery')
  // async getTruckGallery(
  //   @Param('vendorId') vendorId: string,
  // ): Promise<TruckGalleryResponseDto> {
  //   return this.VendorService.getTruckGallery(vendorId);
  // }

}