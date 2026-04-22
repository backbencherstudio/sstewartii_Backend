import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
} from '@nestjs/common';

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
} from '../dto/customer.dto';

import { 
  NearbyVendorsResponseDto,
  CustomerResponseDto,
  TopPicksResponseDto,
  ExploreMapResponseDto,
  FoodFilterResponseDto,
} from '../dto/customer.response.dto';

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
  async getHome(
    @CurrentUser() user: AuthUser,
  ): Promise<HomeResponseDto> {
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
}