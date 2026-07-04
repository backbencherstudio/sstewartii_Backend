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

export class CartListItemDto {
  id!: string;
  productId!: string;
  productName!: string;
  productImage?: string;
  quantity!: number;
}

export class CartListVendorDto {
  id!: string;
  businessName!: string;
  coverImage?: string;
  address?: string;
}

export class CartListItemResponseDto {
  cartId!: string;
  vendor!: CartListVendorDto;
  items!: CartListItemDto[];
  totalAmount!: number;
  itemCount!: number;
  updatedAt!: Date;
}

export class CartListResponseDto {
  carts!: CartListItemResponseDto[];
}

export class CartValidationDto {
  canCheckout!: boolean;
  errors!: string[];
}

export class CartPricingDto {
  subtotal!: number;
  tax!: number;
  serviceFee!: number;
  total!: number;
}

export class CartVendorDto {
  id!: string;
  businessName!: string;
  isOpen!: boolean;
  statusLabel!: string;
  address?: string;
}

export class CartDetailItemDto {
  id!: string;
  productId!: string;
  productName!: string;
  productImage?: string;

  quantity!: number;

  unitPrice!: number;
  sizePrice!: number;
  addOnTotal!: number;
  lineTotal!: number;

  note?: string;

  isAvailable!: boolean;
  unavailableReason?: string;

  sizeOption?: {
    id: string;
    name: string;
  };

  addOns!: {
    id: string;
    name: string;
    price: number;
  }[];
}

export class CartDetailResponseDto {
  cartId!: string;

  vendor!: CartVendorDto;

  items!: CartDetailItemDto[];

  pricing!: CartPricingDto;

  validation!: CartValidationDto;
}
