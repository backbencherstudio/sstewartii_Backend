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
import { CategoryService } from '../../application/category.service';
import { CreateCategoryDto } from '../dto/category.dto';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Post('create-category')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Create Category' })
  @ApiResponse({ status: 201, description: 'Create Category Successfull' })
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(user.id, dto.name);
  }

  @Get('get-category')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Get Category' })
  @ApiResponse({ status: 200, description: 'Get Category Successfull' })
  async getCategories(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getCategories(user.id);
  }
}