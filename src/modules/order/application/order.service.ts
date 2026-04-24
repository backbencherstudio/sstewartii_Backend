import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
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

  // async createOrder(
  //   userId: string,
  //   dto: CreateOrderDto,
  // ): Promise<CreateOrderResponseDto> {
  //   const customer = await this.customerService.findActiveByUserId(userId);

  //   if (!customer) {
  //     throw new NotFoundException('Customer not found');
  //   }

  //   const cart = await this.cartService.findCartByCustomerId(customer.id);

  //   if (!cart) {
  //     throw new NotFoundException('Cart not found');
  //   }

  //   if (!cart.items.length) {
  //     throw new BadRequestException('Cart is empty');
  //   }

  //   const vendorId = cart.items[0].product.vendorId;

  //   const mixedVendor = cart.items.some(
  //     (item: any) => item.product.vendorId !== vendorId,
  //   );

  //   if (mixedVendor) {
  //     throw new BadRequestException(
  //       'Cart contains items from multiple vendors',
  //     );
  //   }

  //   const subtotal = cart.totalAmount;
  //   const tax = 0;
  //   const serviceFee = 0;
  //   const totalAmount = subtotal + tax + serviceFee;

  //   const maxCookTime = Math.max(
  //     ...cart.items.map((item: any) => item.product.estimateCookTime ?? 10),
  //   );

  //   const estimatedReadyAt = new Date(Date.now() + maxCookTime * 60 * 1000);

  //   const orderNumber = this.generateOrderNumber();

  //   const order = await this.orderRepository.createOrderFromCart({
  //     customerId: customer.id,
  //     vendorId,
  //     paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
  //     subtotal,
  //     tax,
  //     serviceFee,
  //     totalAmount,
  //     note: dto.note,
  //     estimatedReadyAt,
  //     orderNumber,
  //     cart,
  //   });

  //   if (!order) {
  //     throw new BadRequestException('Failed to create order');
  //   }

  //   return OrderMapper.toCreateResponse(order);
  // }

  private generateOrderNumber(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TC-${random}`;
  }
}