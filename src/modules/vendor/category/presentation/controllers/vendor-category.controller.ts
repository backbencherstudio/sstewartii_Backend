import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';

import { VendorCategoryService } from '../../application/vendor-category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dto/vendor-category.dto';
import { VendorCategoryResponseDto } from '../dto/vendor-category.response.dto';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { PrismaService } from '@/prisma/prisma.service';
import { VendorCategoryWithProductsResponseDto } from '@/modules/vendor/vendor/presentation/dto/vendor.response.dto';

@Controller('vendor/categories')
@UseGuards(RoleGuard)
@Roles(Role.VENDOR)
export class VendorCategoryController {
  constructor(
    private readonly categoryService: VendorCategoryService,
    private readonly prisma: PrismaService,
  ) {}

  private async getVendorId(userId: string): Promise<string> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found for this user');
    }

    return vendor.id;
  }

  @Post()
  @ResponseMessage('Category created successfully.')
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<VendorCategoryResponseDto> {
    const vendorId = await this.getVendorId(user.id);
    return this.categoryService.createCategory(vendorId, dto);
  }

  @Get()
  async getAllCategories(
    @CurrentUser() user: AuthUser,
  ): Promise<VendorCategoryResponseDto[]> {
    const vendorId = await this.getVendorId(user.id);
    return this.categoryService.getAllCategories(vendorId);
  }

  @Get('with-products')
  async getCategoriesWithProducts(
    @CurrentUser() user: AuthUser,
  ): Promise<VendorCategoryWithProductsResponseDto[]> {
    const vendorId = await this.getVendorId(user.id);
    return this.categoryService.getCategoriesWithProducts(vendorId);
  }

  @Get(':id')
  async getCategoryById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<VendorCategoryResponseDto> {
    const vendorId = await this.getVendorId(user.id);
    return this.categoryService.getCategoryById(vendorId, id);
  }

  @Get('with-products/:id')
  async getCategoryProducts(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<VendorCategoryWithProductsResponseDto> {
    const vendorId = await this.getVendorId(user.id);
    return this.categoryService.getCategoryWithProducts(vendorId, id);
  }

  @Put(':id')
  @ResponseMessage('Category updated successfully.')
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<VendorCategoryResponseDto> {
    const vendorId = await this.getVendorId(user.id);
    return this.categoryService.updateCategory(vendorId, id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Category deleted successfully.')
  async deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const vendorId = await this.getVendorId(user.id);
    await this.categoryService.deleteCategory(vendorId, id);
    return {
      success: true,
      message: 'Category deleted successfully.',
    };
  }
}
