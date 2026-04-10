import { Product } from '@prisma/client';

export interface IProductRepository {
  createFullProduct(data: {
    vendorId: string;
    dto: any;
    images: string[];
  }): Promise<Product>;
}