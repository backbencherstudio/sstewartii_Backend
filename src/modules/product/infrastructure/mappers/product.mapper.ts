// infrastructure/mappers/product.mapper.ts

import { Prisma } from '@prisma/client';
import { Product } from '../../domain/entities/product.entity';
import { ProductResponseDto } from '../../presentation/dto/product.response.dto';

type PrismaProductFull = Prisma.ProductGetPayload<{
  include: {
    category: true;
  };
}>;

export class ProductMapper {

  static toDomain(raw: PrismaProductFull): Product {
    const entity          = new Product();
    entity.id             = raw.id;
    entity.name           = raw.name;
    entity.description    = raw.description;
    entity.price          = raw.price;
    entity.estimateCookTime = raw.estimateCookTime;
    entity.isActive       = raw.isActive;
    entity.vendorId       = raw.vendorId;
    entity.categoryId     = raw.categoryId;
    entity.createdAt      = raw.createdAt;
    return entity;
  }

  static toResponse(entity: Product & { category?: { id: string; name: string } | null }): ProductResponseDto {
    const dto         = new ProductResponseDto();
    dto.id            = entity.id;
    dto.name          = entity.name;
    dto.description   = entity.description;
    dto.price         = entity.price;
    dto.isActive      = entity.isActive;

    dto.category = entity.category
      ? { id: entity.category.id, name: entity.category.name }
      : undefined;

    return dto;
  }
}