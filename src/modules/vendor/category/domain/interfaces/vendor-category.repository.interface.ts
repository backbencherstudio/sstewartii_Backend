import { VendorCategory } from '../entities/vendor-category.entity';

export interface IVendorCategoryRepository {
  create(data: {
    vendorId: string;
    name: string;
    position: number;
  }): Promise<VendorCategory>;
  findAll(vendorId: string): Promise<VendorCategory[]>;
  findAllWithProducts(vendorId: string): Promise<VendorCategory[]>;
  findById(vendorId: string, id: string): Promise<VendorCategory | null>;
  findByIdWithProducts(
    vendorId: string,
    id: string,
  ): Promise<VendorCategory | null>;
  findByName(vendorId: string, name: string): Promise<VendorCategory | null>;
  update(
    vendorId: string,
    id: string,
    data: Partial<VendorCategory>,
  ): Promise<VendorCategory>;
  delete(vendorId: string, id: string): Promise<void>;
  getProductCount(vendorId: string, categoryId: string): Promise<number>;
  isCategoryEmpty(vendorId: string, categoryId: string): Promise<boolean>;
  getMaxPosition(vendorId: string): Promise<number>;
}
