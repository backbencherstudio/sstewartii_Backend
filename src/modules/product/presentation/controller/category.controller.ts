import {
  Controller,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';

import { CategorySearchQueryDto } from '../dto/category.dto';
import { CategoryResponseDto } from '../dto/category.response.dto';
import { CategoryService } from '../../application/category.service';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categiryService: CategoryService) {}

  @Get('get-search')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async searchCategories(
    @Query() query: CategorySearchQueryDto,
  ): Promise<CategoryResponseDto[]> {
    return this.categiryService.searchCategories(query);
  }
}
