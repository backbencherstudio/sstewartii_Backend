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
  status!: 
    | 'ORDER_CONFIRMED'
    | 'PREPARING'
    | 'READY_FOR_PICKUP'
    | 'COMPLETED'
    | 'CANCELLED';

  title!: string;
  description!: string;

  isCompleted!: boolean;
  isCurrent!: boolean;

  timestamp?: Date | null;
  estimatedTime?: Date | null;
}

export class OrderTrackCustomerLocationDto {
  latitude?: number;
  longitude?: number;
  address?: string;
}

export class OrderTrackResponseDto {
  id!: string;
  orderNumber!: string;
  status!: OrderStatus;

  placedAt!: Date;
  estimatedReadyAt?: Date | null;

  customerLocation?: OrderTrackCustomerLocationDto;

  vendor!: OrderTrackVendorDto;

  timeline!: OrderTrackStepDto[];

  canCancel!: boolean;

  totalAmount!: number;
}

export class VendorActiveOrderCustomerDto {
  id!: string;
  name!: string;
  imageUrl?: string;
}

export class VendorActiveOrderChoiceOptionDto {
  id!: string;
  choiceOptionId?: string | null;
  name!: string;
  price!: number;
}

export class VendorActiveOrderAddOnDto {
  id!: string;
  addOnId?: string | null;
  name!: string;
  price!: number;
}

export class VendorActiveOrderItemDto {
  id!: string;
  productName!: string;
  quantity!: number;
  unitPrice!: number;
  sizeName?: string;
  sizePrice!: number;
  choiceOptions!: VendorActiveOrderChoiceOptionDto[];
  addOns!: VendorActiveOrderAddOnDto[];
  lineTotal!: number;
  displayText!: string;
}

export class VendorActiveOrderListItemDto {
  id!: string;
  orderNumber!: string;
  status!: OrderStatus;
  customer!: VendorActiveOrderCustomerDto;
  items!: VendorActiveOrderItemDto[];
  itemCount!: number;
  uniqueItemCount!: number;
  itemSummaryLabel!: string;
  totalAmount!: number;
  createdAt!: Date;
  estimatedReadyAt?: Date | null;
  statusLabel!: string;
  actionLabel!: string;
  timeLabel!: string;
  isLate!: boolean;
  minutesLate!: number;
  minutesLeft!: number;
}

export class VendorActiveOrdersResponseDto {
  total!: number;
  items!: VendorActiveOrderListItemDto[];
}

export class VendorOrderDetailCustomerDto {
  id!: string;
  name!: string;
  email?: string;
  imageUrl?: string;
  customerSince!: Date;
}

export class VendorOrderDetailChoiceOptionDto {
  id!: string;
  choiceOptionId?: string | null;
  name!: string;
  price!: number;
}

export class VendorOrderDetailAddOnDto {
  id!: string;
  addOnId?: string | null;
  name!: string;
  price!: number;
}

export class VendorOrderDetailItemDto {
  id!: string;
  productId!: string;
  productName!: string;

  quantity!: number;

  unitPrice!: number;

  sizeName?: string;
  sizePrice!: number;

  choiceOptions!: VendorOrderDetailChoiceOptionDto[];
  addOns!: VendorOrderDetailAddOnDto[];

  lineTotal!: number;

  displayText!: string;
  optionSummary?: string;
}

export class VendorOrderTimelineStepDto {
  key!:
    | 'ORDER_PLACED'
    | 'ORDER_CONFIRMED'
    | 'READY_FOR_PICKUP'
    | 'PICKED_UP_BY_CUSTOMER'
    | 'ORDER_COMPLETED'
    | 'ORDER_CANCELLED';

  title!: string;
  isCompleted!: boolean;
  isCurrent!: boolean;
  timestamp?: Date | null;
}

export class VendorOrderDetailActionsDto {
  canAccept!: boolean;
  canCancel!: boolean;
  canMarkReadyForPickup!: boolean;
  canComplete!: boolean;
  canReportIncomplete!: boolean;
}

export class VendorOrderDetailResponseDto {
  id!: string;
  orderNumber!: string;
  status!: OrderStatus;
  statusLabel!: string;
  paymentMethod!: PaymentMethod;
  customer!: VendorOrderDetailCustomerDto;
  items!: VendorOrderDetailItemDto[];
  itemCount!: number;
  uniqueItemCount!: number;
  itemSummaryLabel!: string;
  subtotal!: number;
  tax!: number;
  serviceFee!: number;
  totalAmount!: number;
  note?: string;
  createdAt!: Date;
  estimatedReadyAt?: Date | null;
  confirmedAt?: Date | null;
  readyAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  timeline!: VendorOrderTimelineStepDto[];
  actions!: VendorOrderDetailActionsDto;
}