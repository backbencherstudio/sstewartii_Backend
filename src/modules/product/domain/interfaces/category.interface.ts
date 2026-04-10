import { Category } from '../entities/category.entity';

export interface ICategoryRepository {
  create(data: Category): Promise<Category>;
  findByVendorId(vendorId: string): Promise<Category[]>;
  findByName(vendorId: string, name: string): Promise<Category | null>;
}