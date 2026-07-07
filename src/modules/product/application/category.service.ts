import { Injectable, Inject } from '@nestjs/common';
import type { ICategoryRepository } from '../domain/interfaces/category.interface';
import { CategorySearchQueryDto } from '../presentation/dto/category.dto';
import { CategoryResponseDto } from '../presentation/dto/category.response.dto';
import { CategoryMapper } from '../infrastructure/mappers/category.mapper';

@Injectable()
export class CategoryService {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepo: ICategoryRepository,
    private readonly categoryMapper: CategoryMapper,
  ) {}

  async searchCategories(
    query: CategorySearchQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepo.searchCategories(query.keyword);

    return this.categoryMapper.toListResponse(categories);
  }
}
