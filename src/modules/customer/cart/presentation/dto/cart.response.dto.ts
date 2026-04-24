export class CartItemResponseDto {
  id!: string;
  productId!: string;
  productName!: string;
  productImage?: string;
  vendorId!: string;
  vendorName!: string;

  quantity!: number;
  unitBasePrice!: number;
  sizePrice!: number;
  addOnTotal!: number;
  lineTotal!: number;

  note?: string;

  sizeOption?: {
    id: string;
    name: string;
    price: number;
  };

  choiceOptions!: {
    id: string;
    name: string;
    price: number;
  }[];

  addOns!: {
    id: string;
    name: string;
    price: number;
  }[];
}

export class CartResponseDto {
  id!: string;
  customerId!: string;
  vendorId!: string;
  vendorName!: string;
  totalAmount!: number;
  items!: CartItemResponseDto[];
  itemCount!: number;
  updatedAt!: Date;
}