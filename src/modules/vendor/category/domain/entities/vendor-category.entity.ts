export interface ProductBrief {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  description?: string;
  estimateCookTime?: number;
  imageUrl?: string | null;
}

export class VendorCategory {
  id: string;
  name: string;
  vendorId: string;
  isActive: boolean;
  position: number;
  productCount?: number;
  products?: ProductBrief[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<VendorCategory>) {
    this.id = partial.id || '';
    this.name = partial.name || '';
    this.vendorId = partial.vendorId || '';
    this.isActive = partial.isActive ?? true;
    this.position = partial.position ?? 0;
    this.productCount = partial.productCount || 0;
    this.products = partial.products || [];
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = partial.updatedAt || new Date();
  }
}
