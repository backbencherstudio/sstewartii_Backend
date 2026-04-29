import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import type { IOrderRepository } from '../domain/interface/order.repository.interface';
import { CreateOrderDto } from '../presentation/dto/create-order.dto';
import { CreateOrderResponseDto } from '../presentation/dto/order.response.dto';
import { OrderMapper } from '../infrastructure/mapper/order.mapper';
import { CustomerService } from '@/modules/customer/customer/application/customer.service';
import { CartService } from '@/modules/customer/cart/application/cart.service';

@Injectable()
export class OrderService {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepository: IOrderRepository,
    private readonly customerService: CustomerService,
    private readonly cartService: CartService,
  ) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const cart = await this.cartService.findCartById(dto.cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customer.id) {
      throw new BadRequestException('Invalid cart');
    }

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const subtotal = cart.totalAmount;
    const tax = 0;
    const serviceFee = 0;
    const totalAmount = subtotal + tax + serviceFee;

    const orderItems = cart.items.map((item: any) => {
      const sizePrice = item.sizeOption?.price ?? 0;

      const addOnTotal = item.addOns.reduce(
        (sum: number, entry: any) => sum + entry.addOn.price,
        0,
      );

      const lineTotal = (item.price + sizePrice + addOnTotal) * item.quantity;

      return {
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.price,
        sizeName: item.sizeOption?.name,
        sizePrice,
        lineTotal,
        choiceOptions: item.choiceOptions.map((entry: any) => ({
          id: entry.choiceOption.id,
          name: entry.choiceOption.name,
          price: entry.choiceOption.price,
        })),
        addOns: item.addOns.map((entry: any) => ({
          id: entry.addOn.id,
          name: entry.addOn.name,
          price: entry.addOn.price,
        })),
      };
    });

    const order = await this.orderRepository.createOrderFromCart({
      orderNumber: this.generateOrderNumber(),
      customerId: customer.id,
      vendorId: cart.vendorId,
      paymentMethod: dto.paymentMethod,
      note: dto.note,
      subtotal,
      tax,
      serviceFee,
      totalAmount,
      items: orderItems,
    });

    return OrderMapper.toCreateResponse(order);
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}