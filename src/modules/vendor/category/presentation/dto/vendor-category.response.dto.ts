export class VendorCategoryResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  position: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<VendorCategoryResponseDto>) {
    this.id = partial.id || '';
    this.name = partial.name || '';
    this.isActive = partial.isActive ?? true;
    this.position = partial.position ?? 0;
    this.productCount = partial.productCount ?? 0;
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = partial.updatedAt || new Date();
  }
}
