import { Product } from '../entities/product.entity';
import { Prisma } from '@prisma/client';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
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

  searchProducts(
    params: SearchProductsParams,
  ): Promise<Product[]>;

  updateProductStatus(
    productId: string,
    isActive: boolean,
  ): Promise<Product>;

  findProductByIdAndVendorId(
    userId: string,
    productId: string,
  );

  deleteProduct(productId: string): Promise<void>;

}