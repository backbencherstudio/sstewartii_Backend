import { Product } from '../entities/product.entity';
import { Prisma } from '@prisma/client';
import { ProductCart } from '../entities/product.entity';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export type ProductDetailPrisma = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
    sizeOptions: true;
    choiceOptions: true;
    addOns: true;
    vendor: {
      include: {
        cuisines: {
          include: {
            cuisine: true;
          };
        };
      };
    };
  };
}>;

export interface SearchProductsParams {
  vendorId: string;
  search?: string;
  category?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedProducts {
  data: ProductWithCategory[];
  total: number;
  page: number;
  limit: number;
}

export interface IProductRepository {
  createFullProduct(data: {
    vendorId: string;
    dto: any;
    images: string[];
  }): Promise<Product>;

  findProductByVendorId(vendorId: string): Promise<Product[]>;

  searchProducts(params: SearchProductsParams): Promise<Product[]>;

  updateProductStatus(productId: string, isActive: boolean): Promise<Product>;

  findProductByIdAndVendorId(userId: string, productId: string);

  deleteProduct(productId: string): Promise<void>;

  findProductDetailById(productId: string): Promise<ProductDetailPrisma | null>;

  findActiveProductForCart(productId: string): Promise<ProductCart | null>;

  existsCuisineById(cuisineId: string): Promise<boolean>;

  existsActiveCategoryById(categoryId: string): Promise<boolean>;
}
