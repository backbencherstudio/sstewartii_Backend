import { Controller, Req, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductService } from '../../application/product.service';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get('get/cuisines')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Cuisines' })
  @ApiResponse({ status: 200, description: 'Get Cuisines Successfull' })
  async getVendorCuisines(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getVendorCuisines(user.id);
  }
}
