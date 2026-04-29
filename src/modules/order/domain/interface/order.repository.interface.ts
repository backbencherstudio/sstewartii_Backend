import { PaymentMethod, Prisma } from '@prisma/client';

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

export interface IOrderRepository {
  createOrderFromCart(input: CreateOrderFromCartInput): Promise<any>;
}