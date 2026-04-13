export class Product {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  estimateCookTime!: number;
  isActive!: boolean;
  vendorId!: string;
  categoryId!: string | null;
  createdAt!: Date;
  category?: { id: string; name: string } | null;
}
