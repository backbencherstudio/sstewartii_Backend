// src/modules/category/infrastructure/mapper/category.mapper.ts

import { Injectable } from '@nestjs/common';
import { CategoryResponseDto } from '../../presentation/dto/category.response.dto';
import { CategorySearchView } from '../../domain/interfaces/category.interface';

@Injectable()
export class CategoryMapper {
  toResponse(category: CategorySearchView): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
    };
  }

  toListResponse(categories: CategorySearchView[]): CategoryResponseDto[] {
    return categories.map((category) => this.toResponse(category));
  }
}