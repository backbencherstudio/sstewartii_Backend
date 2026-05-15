import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';
import { Category } from '../domain/entities/category.entity';
import type { ICategoryRepository } from '../domain/interfaces/category.interface';
import { CategorySearchQueryDto } from '../presentation/dto/category.dto';
import { CategoryResponseDto } from '../presentation/dto/category.response.dto';

@Injectable()
export class CategoryService {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepo: ICategoryRepository,
  ) {}

 async searchCategories(
    query: CategorySearchQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepo.searchCategories(
      query.keyword,
    );

    return this.categoryMapper.toListResponse(categories);
  }
}