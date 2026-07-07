import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import {
  VendorCategory,
} from '../../domain/entities/vendor-category.entity';

// Type for category with count only
interface CategoryWithCount extends Category {
  _count?: {
    products?: number;
  };
}

// Type for category with products (using select, not include)
interface CategoryWithProducts extends Category {
  products: {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
    description: string;
    estimateCookTime: number;
    images: {
      url: string;
    }[];
  }[];
  _count?: {
    products?: number;
  };
}

@Injectable()
export class VendorCategoryMapper {
  toDomain(prismaCategory: Category): VendorCategory {
    return new VendorCategory({
      id: prismaCategory.id,
      name: prismaCategory.name,
      vendorId: prismaCategory.vendorId,
      isActive: prismaCategory.isActive,
      position: prismaCategory.position,
      createdAt: prismaCategory.createdAt,
      updatedAt: prismaCategory.updatedAt,
    });
  }

  toDomainWithCount(
    prismaCategory: CategoryWithCount,
    vendorId?: string,
  ): VendorCategory {
    const category = this.toDomain(prismaCategory);
    if (vendorId && prismaCategory._count) {
      category.productCount = prismaCategory._count.products || 0;
    }
    return category;
  }

  toDomainWithProducts(
    prismaCategory: CategoryWithProducts,
    vendorId?: string,
  ): VendorCategory {
    const category = this.toDomain(prismaCategory);

    if (vendorId && prismaCategory._count) {
      category.productCount = prismaCategory._count.products || 0;
    }

    // Map products with their primary image
    category.products = prismaCategory.products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      isActive: product.isActive,
      description: product.description,
      estimateCookTime: product.estimateCookTime,
      imageUrl: product.images.length > 0 ? product.images[0].url : null,
    }));

    return category;
  }
}
