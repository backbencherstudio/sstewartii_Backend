import { PaymentMethod, Prisma, OrderReportReason } from '@prisma/client';
import { VendorOrderHistoryQueryDto } from '../../presentation/dto/order.dto';

export interface CreateOrderFromCartInput {
  orderNumber: string;
  customerId: string;
  vendorId: string;
  paymentMethod: string;
  note?: string;
  subtotal: number;
  tax: number;
  serviceFee: number;
  totalAmount: number;
  estimatedReadyAt: Date;
  items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  sizeName?: string;
  sizePrice: number;
  lineTotal: number;

  choiceOptions: {
    id: string;
    name: string;
    price: number;
  }[];

  addOns: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface VendorOrderHistoryResult {
  total: number;
  completedCount: number;
  cancelledCount: number;
  items: any[];
}

export interface CreateOrderReportInput {
  orderId: string;
  vendorId: string;
  customerId: string;
  reason: OrderReportReason;
  description?: string;
  imageUrls?: string[];
}

export interface IOrderRepository {
  createOrderFromCart(input: CreateOrderFromCartInput): Promise<any>;

  findOrderSummaryById(orderId: string): Promise<any | null>;

  findOrderTrackById(orderId: string): Promise<any | null>;

  cancelOrder(data: { orderId: string; cancelledAt: Date }): Promise<any>;

  findActiveOrdersByVendorId(vendorId: string): Promise<any[]>;

  findVendorOrderDetailById(orderId: string): Promise<any | null>;

  findVendorOrderForCancel(orderId: string): Promise<any | null>;

  cancelVendorOrder(data: { orderId: string; cancelledAt: Date }): Promise<any>;

  findVendorOrderForAction(orderId: string): Promise<any | null>;

  acceptVendorOrder(data: { orderId: string; confirmedAt: Date }): Promise<any>;

  markVendorOrderReadyForPickup(data: {
    orderId: string;
    readyAt: Date;
  }): Promise<any>;

  completeVendorOrder(data: {
    orderId: string;
    completedAt: Date;
  }): Promise<any>;

  findPendingOrdersByVendorId(vendorId: string): Promise<any[]>;

  findHistoryOrdersByVendorId(
    vendorId: string,
    query: VendorOrderHistoryQueryDto,
  ): Promise<VendorOrderHistoryResult>;

  findVendorOrderForReport(orderId: string): Promise<any | null>;

  findExistingOrderReport(data: {
    orderId: string;
    vendorId: string;
  }): Promise<{ id: string } | null>;

  createOrderReport(data: CreateOrderReportInput): Promise<any>;

  findVendorOrderReportByOrderId(data: {
    orderId: string;
    vendorId: string;
  }): Promise<any | null>;
}
