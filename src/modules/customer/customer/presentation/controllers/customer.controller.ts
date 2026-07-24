import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
  Put,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { CustomerService } from '../../application/customer.service';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { HomeResponseDto } from '../dto/home.response.dto';
import { HomeService } from '../../application/home.service';

import {
  NearbyVendorsQueryDto,
  SetCustomerLocationDto,
  TopPicksQueryDto,
  ExploreMapQueryDto,
  FoodFilterQueryDto,
  FavoriteProductsQueryDto,
  FavoriteVendorsQueryDto,
  CustomerAdvancedSearchQueryDto,
  OrderAgainDto,
  OrderHistoryQueryDto,
} from '../dto/customer.dto';

import {
  NearbyVendorsResponseDto,
  CustomerResponseDto,
  TopPicksResponseDto,
  ExploreMapResponseDto,
  FoodFilterResponseDto,
  FavoriteProductsResponseDto,
  FavoriteVendorsResponseDto,
  CustomerAdvancedSearchResponseDto,
} from '../dto/customer.response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCustomerProfileDto } from '../dto/customer-profile-update.dto';

@ApiTags('Customer')
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly service: CustomerService,
    private readonly homeService: HomeService,
  ) {}

  @Post('set-location')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Set Location Successfull.')
  async setLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetCustomerLocationDto,
  ): Promise<CustomerResponseDto> {
    return this.service.setLocation(user.id, dto);
  }

  @Get('home')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getHome(@CurrentUser() user: AuthUser): Promise<HomeResponseDto> {
    return this.homeService.getHome(user.id);
  }

  @Get('nearby-vendors')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getNearbyVendors(
    @CurrentUser() user: AuthUser,
    @Query() query: NearbyVendorsQueryDto,
  ): Promise<NearbyVendorsResponseDto> {
    return this.service.getNearbyVendors(user.id, query);
  }

  @Get('top-picks')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getTopPicks(
    @CurrentUser() user: AuthUser,
    @Query() query: TopPicksQueryDto,
  ): Promise<TopPicksResponseDto> {
    return this.service.getTopPicks(user.id, query);
  }

  @Get('explore-map')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getExploreMap(
    @CurrentUser() user: AuthUser,
    @Query() query: ExploreMapQueryDto,
  ): Promise<ExploreMapResponseDto> {
    return this.service.getExploreMap(user.id, query);
  }

  @Get('foods')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getFoods(
    @CurrentUser() user: AuthUser,
    @Query() query: FoodFilterQueryDto,
  ): Promise<FoodFilterResponseDto> {
    return this.service.getFoods(user.id, query);
  }

  @Post('favorites/products/:productId')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Favorite updated successfully')
  async toggleFavoriteProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ): Promise<{ isFavorited: boolean }> {
    return this.service.toggleFavoriteProduct(user.id, productId);
  }

  @Get('favorites/products')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get favorite products with pagination and field selection',
  })
  @ApiResponse({ status: 200, description: 'Returns favorite products' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to return',
    example: 'id,name,price,vendor.businessName,image',
  })
  async getFavoriteProducts(
    @CurrentUser() user: AuthUser,
    @Query() query: FavoriteProductsQueryDto,
  ): Promise<FavoriteProductsResponseDto> {
    return this.service.getFavoriteProducts(user.id, query);
  }

  @Post('favorites/vendors/:vendorId')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Favorite updated successfully')
  async toggleFavoriteVendor(
    @CurrentUser() user: AuthUser,
    @Param('vendorId') vendorId: string,
  ): Promise<{ isFavorited: boolean }> {
    return this.service.toggleFavoriteVendor(user.id, vendorId);
  }

  @Get('favorites/truck')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getFavoriteVendors(
    @CurrentUser() user: AuthUser,
    @Query() query: FavoriteVendorsQueryDto,
  ): Promise<FavoriteVendorsResponseDto> {
    return this.service.getFavoriteVendors(user.id, query);
  }

  /**
   * Get all favorite product IDs for the authenticated user
   * Returns only IDs, not full objects
   */
  @Get('favorites/products/ids')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get all favorite product IDs for the current user',
    description:
      'Returns an array of product IDs that the user has favorited. Useful for checking favorite status in bulk.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of favorite product IDs',
    schema: {
      example: {
        productIds: ['prod_123', 'prod_456', 'prod_789'],
        count: 3,
      },
    },
  })
  async getAllFavoriteProductIds(
    @CurrentUser() user: AuthUser,
  ): Promise<{ productIds: string[]; count: number }> {
    return this.service.getAllFavoriteProductIds(user.id);
  }

  /**
   * Get all favorite vendor IDs for the authenticated user
   * Returns only IDs, not full objects
   */
  @Get('favorites/truck/ids')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get all favorite vendor/truck IDs for the current user',
    description:
      'Returns an array of vendor IDs that the user has favorited. Useful for checking favorite status in bulk.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of favorite vendor IDs',
    schema: {
      example: {
        vendorIds: ['vendor_123', 'vendor_456', 'vendor_789'],
        count: 3,
      },
    },
  })
  async getAllFavoriteVendorIds(
    @CurrentUser() user: AuthUser,
  ): Promise<{ vendorIds: string[]; count: number }> {
    return this.service.getAllFavoriteVendorIds(user.id);
  }

  /**
   * Update customer profile with optional avatar upload
   * Supports multipart/form-data
   */
  @Put('profile')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({
    summary: 'Update customer profile with optional avatar upload',
    description:
      'Update customer profile f  ields and optionally upload a new avatar image.',
  })
  @ResponseMessage('Profile updated successfully')
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCustomerProfileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType:
              /(image\/jpeg|image\/png|image\/webp|image\/gif|image\/svg\+xml)/,
          }),
        ],
        fileIsRequired: false, // Avatar is optional
      }),
    )
    avatarFile?: Express.Multer.File,
  ): Promise<CustomerResponseDto> {
    return this.service.updateProfile(user.id, dto, avatarFile);
  }

  @Get('orders')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ApiQuery({
    name: 'filter',
    enum: ['all', 'completed', 'cancelled'],
    required: false,
  })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getOrderHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderHistoryQueryDto,
  ) {
    return this.service.getOrderHistory(user.id, query);
  }

  @Get('orders/:orderId')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getOrderDetail(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.service.getOrderDetail(user.id, orderId);
  }

  @Post('orders/again')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Items added to cart successfully')
  async orderAgain(@CurrentUser() user: AuthUser, @Body() dto: OrderAgainDto) {
    return this.service.orderAgain(user.id, dto);
  }

  @Get('food-advhance-search')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async advancedSearch(
    @CurrentUser() user: AuthUser,
    @Query() query: CustomerAdvancedSearchQueryDto,
  ): Promise<CustomerAdvancedSearchResponseDto> {
    return this.service.advancedSearch(user.id, query);
  }
}
