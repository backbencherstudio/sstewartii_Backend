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
  Patch,
  Delete,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';

import { 
  VendorMenuQueryDto,
  UploadTruckGalleryDto,
  UpdateVendorStatusDto,
  VendorMenuItemsQueryDto,
  UpdateVendorMenuItemStatusDto,
 } from '../dto/vendor.dto';
import { 
  VendorInsightsOverviewQueryDto,
  VendorInsightsRevenueQueryDto,
  VendorPeakHoursQueryDto,
} from '../dto/vendor-insights.query.dto';

import { 
  VendorMenuResponseDto,
  VendorInfoResponseDto,
  UploadTruckGalleryResponseDto,
  TruckGalleryResponseDto,
  VendorHomeResponseDto,
  VendorStatusResponseDto,
  VendorMenuCategoriesResponseDto,
  VendorMenuItemsResponseDto,
  VendorMenuItemStatusResponseDto,
  DeleteVendorMenuItemResponseDto,
 } from '../dto/vendor.response.dto';
import { 
  VendorInsightsOverviewResponseDto,
  VendorRevenueChartResponseDto,
  VendorPeakHoursResponseDto,
 } from '../dto/vendor-insights.response.dto';

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
    private readonly vendorService: VendorService
  ) {}

  @Get('me')
  async getMyVendor(@Req() req: any) {
    const userId = req.user.sub;  
    return this.vendorService.execute(userId);
  }

  @Public()
  @Get(':vendorId/menu')
  async getVendorMenu(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorMenuQueryDto,
  ): Promise<VendorMenuResponseDto> {
    return this.vendorService.getVendorMenu(vendorId, query);
  }

  @Public()
  @Get(':vendorId/info')
  async getVendorInfo(
    @Param('vendorId') vendorId: string,
  ): Promise<VendorInfoResponseDto> {
    return this.vendorService.getVendorInfo(vendorId);
  }

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
    return this.vendorService.uploadTruckGalleryImages(user.id, dto, files);
  }

  @Get('home')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorHome(
    @CurrentUser() user: AuthUser,
  ): Promise<VendorHomeResponseDto> {
    return this.vendorService.getVendorHome(user.id);
  }

  @Patch('status-update')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Vendor status updated successfully.')
  async updateVendorStatus(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateVendorStatusDto,
  ): Promise<VendorStatusResponseDto> {
    return this.vendorService.updateVendorStatus(user.id, dto);
  }

  @Get('menu/categories')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorMenuCategories(
    @CurrentUser() user: AuthUser,
  ): Promise<VendorMenuCategoriesResponseDto> {
    return this.vendorService.getVendorMenuCategories(user.id);
  }

  @Get('menu/items')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorMenuItems(
    @CurrentUser() user: AuthUser,
    @Query() query: VendorMenuItemsQueryDto,
  ): Promise<VendorMenuItemsResponseDto> {
    return this.vendorService.getVendorMenuItems(user.id, query);
  }

  @Patch('menu/items/:productId/status')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Menu item status updated successfully.')
  async updateVendorMenuItemStatus(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateVendorMenuItemStatusDto,
  ): Promise<VendorMenuItemStatusResponseDto> {
    return this.vendorService.updateVendorMenuItemStatus(
      user.id,
      productId,
      dto,
    );
  }

  @Delete('menu/items/:productId')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Menu item deleted successfully.')
  async deleteVendorMenuItem(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ): Promise<DeleteVendorMenuItemResponseDto> {
    return this.vendorService.deleteVendorMenuItem(user.id, productId);
  }

  @Get('truck-gallery/me')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getMyTruckGallery(
    @CurrentUser() user: AuthUser,
  ): Promise<TruckGalleryResponseDto> {
    return this.vendorService.getMyTruckGallery(user.id);
  }

  @Get('insights/overview')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorInsightsOverview(
    @CurrentUser() user: AuthUser,
    @Query() query: VendorInsightsOverviewQueryDto,
  ): Promise<VendorInsightsOverviewResponseDto> {
    return this.vendorService.getVendorInsightsOverview(
      user.id,
      query,
    );
  }

  @Get('insights/revenue')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorRevenueChart(
    @CurrentUser() user: AuthUser,
    @Query() query: VendorInsightsRevenueQueryDto,
  ): Promise<VendorRevenueChartResponseDto> {
    return this.vendorService.getVendorRevenueChart(
      user.id,
      query,
    );
  }

  @Get('insights/peak-hours')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorPeakHours(
    @CurrentUser() user: AuthUser,
    @Query() query: VendorPeakHoursQueryDto,
  ): Promise<VendorPeakHoursResponseDto> {
    return this.vendorService.getVendorPeakHours(user.id, query);
  }

}