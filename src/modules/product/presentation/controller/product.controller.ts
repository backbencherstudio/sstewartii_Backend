import { Controller,
   Req,
   Post,
   Body, 
   Request, 
   UseGuards, 
   Get,
   UseInterceptors, 
   UploadedFiles, 
   Query ,
   Patch,
   ParseUUIDPipe,
   Param,
   Delete,
   HttpCode,
  } from '@nestjs/common';
   
import { FilesInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ProductService } from '../../application/product.service';
import { CreateProductDto } from '../dto/product.dto';
import { ProductResponseDto } from '../dto/product.response.dto';
import { SearchProductQueryDto } from '../dto/searchQuery.dto';
import { UpdateProductStatusDto } from '../dto/product.dto';
import { ApiResponses } from '@/common/types/api-response.type';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get('get/cuisines')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Cuisines Get Successfull.')
  @ApiOperation({ summary: 'Cuisines' })
  @ApiResponse({ status: 200, description: 'Get Cuisines Successfull' })
  async getVendorCuisines(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getVendorCuisines(user.id);
  }

  @Post('create/product')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FilesInterceptor('productImage', 5))
  @ResponseMessage('Product Create Successfull.')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.createProduct(user.id, dto, files);
  }

  @Get('get/my-products')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getMyProducts(
    @CurrentUser() user: AuthUser,
  ): Promise<ProductResponseDto[]> {
    return this.service.getVendorProducts(user.id);
  }

  @Get('vendor-product/search')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async searchProducts(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchProductQueryDto,
  ) {
    return this.service.searchProducts(user.id, query);
  }

  @Patch(':productId/status')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Update product availability status' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  async updateProductStatus(
  @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductStatusDto,
  ): Promise<ApiResponses<ProductResponseDto>> {
    const data = await this.service.updateProductStatus(
      user.id,
      productId,
      dto,
    );

    return {
      success: true,
      message: `Product marked as ${dto.isActive ? 'active' : 'inactive'} successfully`,
      data,
    };
  }

  @Delete('delete-product/:productId')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Product deleted successfully')
  @ApiOperation({ summary: 'Delete a vendor product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  async deleteProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<void> {
    return this.service.deleteProduct(user.id, productId);
  }

}
