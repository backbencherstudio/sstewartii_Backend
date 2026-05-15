// infrastructure/mappers/product.mapper.ts

import { Prisma } from '@prisma/client';
import { Product } from '../../domain/entities/product.entity';
import { 
  ProductResponseDto,
 } from '../../presentation/dto/product.response.dto';
import { ProductCart } from '../../domain/entities/product.entity';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@/common/media/media.service';

type PrismaProductFull = Prisma.ProductGetPayload<{
  include: {
    category: true;
  };
}>;

type ProductCartPrisma = Prisma.ProductGetPayload<{
  include: {
    sizeOptions: true;
    choiceOptions: true;
    addOns: true;
  };
}>;

@Injectable()
export class ProductMapper {
  constructor(private readonly mediaService: MediaService) {}

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

  toResponse(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      estimateCookTime: product.estimateCookTime,
      isActive: product.isActive,

      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : undefined,

      cuisine: product.cuisine
        ? {
            id: product.cuisine.id,
            name: product.cuisine.name,
            imageUrl: product.cuisine.imageUrl
              ? this.resolveMediaUrl(product.cuisine.imageUrl)
              : undefined,
          }
        : undefined,

      images: product.images.map((image: any) => ({
        id: image.id,
        url: this.resolveMediaUrl(image.url),
        isPrimary: image.isPrimary,
        position: image.position,
      })),

      sizeOptions: product.sizeOptions.map((size: any) => ({
        id: size.id,
        name: size.name,
        price: size.price,
        isRequired: size.isRequired,
      })),

      choiceOptions: product.choiceOptions.map((choice: any) => ({
        id: choice.id,
        name: choice.name,
        price: choice.price,
        isRequired: choice.isRequired,
      })),

      addOns: product.addOns.map((addOn: any) => ({
        id: addOn.id,
        name: addOn.name,
        price: addOn.price,
        isRequired: addOn.isRequired,
      })),
    };
  }

  private resolveMediaUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }
}

export class ProductCartMapper {
  static toDomain(raw: ProductCartPrisma): ProductCart {
    const entity = new ProductCart();

    entity.id = raw.id;
    entity.name = raw.name;
    entity.price = raw.price;
    entity.isActive = raw.isActive;
    entity.vendorId = raw.vendorId;

    entity.sizeOptions = raw.sizeOptions.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      isRequired: item.isRequired,
    }));

    entity.choiceOptions = raw.choiceOptions.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      isRequired: item.isRequired,
    }));

    entity.addOns = raw.addOns.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      isRequired: item.isRequired,
    }));

    return entity;
  }
}