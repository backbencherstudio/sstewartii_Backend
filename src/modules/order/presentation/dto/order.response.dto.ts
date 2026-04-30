import { PaymentMethod, OrderStatus,  } from '@prisma/client';

export class OrderItemChoiceOptionResponseDto {
  id!: string;
  choiceOptionId?: string | null;
  name!: string;
  price!: number;
}

export class OrderItemAddOnResponseDto {
  id!: string;
  addOnId?: string | null;
  name!: string;
  price!: number;
}

export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  productName!: string;
  quantity!: number;

  unitPrice!: number;

  sizeName?: string;
  sizePrice!: number;

  note?: string;

  lineTotal!: number;

  choiceOptions!: OrderItemChoiceOptionResponseDto[];
  addOns!: OrderItemAddOnResponseDto[];
}

export class CreateOrderResponseDto {
  id!: string;

  orderNumber!: string;

  customerId!: string;
  vendorId!: string;

  status!: OrderStatus;
  paymentMethod!: PaymentMethod;

  subtotal!: number;
  tax!: number;
  serviceFee!: number;
  totalAmount!: number;

  note?: string;

  estimatedReadyAt?: Date | null;

  createdAt!: Date;

  orderItems!: OrderItemResponseDto[];
}

export class OrderSummaryVendorDto {
  id!: string;
  businessName!: string;
  contactNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export class OrderSummaryItemDto {
  id!: string;
  productId!: string;
  productName!: string;
  quantity!: number;
  unitPrice!: number;
  sizeName?: string;
  sizePrice!: number;
  lineTotal!: number;

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

export class OrderSummaryResponseDto {
  id!: string;
  orderNumber!: string;

  status!: OrderStatus;
  paymentMethod!: PaymentMethod;

  estimatedReadyAt?: Date | null;

  vendor!: OrderSummaryVendorDto;

  items!: OrderSummaryItemDto[];

  subtotal!: number;
  tax!: number;
  serviceFee!: number;
  totalAmount!: number;

  note?: string;

  createdAt!: Date;
}

export class OrderTrackVendorDto {
  id!: string;
  businessName!: string;
  contactNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export class OrderTrackStepDto {
  key!: OrderStatus;

  title!: string;
  description!: string;

  isCompleted!: boolean;
  isCurrent!: boolean;

  timestamp?: Date | null;
  estimatedTime?: Date | null;
}

export class OrderTrackResponseDto {
  id!: string;
  orderNumber!: string;
  status!: OrderStatus;

  placedAt!: Date;
  estimatedReadyAt?: Date | null;

  vendor!: OrderTrackVendorDto;

  timeline!: OrderTrackStepDto[];

  canCancel!: boolean;

  totalAmount!: number;
}