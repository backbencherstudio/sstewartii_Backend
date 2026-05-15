import { 
  Controller, 
  Req,
  Post, 
  Body, 
  Request, 
  UseGuards,
  Query,
  Get } from '@nestjs/common';

import { CategorySearchQueryDto } from '../dto/category.dto';
import { CategoryResponseDto } from '../dto/category.response.dto';

import { CategoryService } from '../../application/category.service';

import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categiryService: CategoryService) {}

  @Get('search')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async searchCategories(
    @Query() query: CategorySearchQueryDto,
  ): Promise<CategoryResponseDto[]> {
    return this.categiryService.searchCategories(query);
  }
}