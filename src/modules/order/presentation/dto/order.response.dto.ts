import { PaymentMethod, OrderStatus } from '@prisma/client';

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