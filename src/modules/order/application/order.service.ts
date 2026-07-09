import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { OrderStatus } from '@prisma/client';

import type { IOrderRepository } from '../domain/interface/order.repository.interface';

import { OrderMapper } from '../infrastructure/mapper/order.mapper';

import {
  VendorOrderHistoryQueryDto,
  CreateOrderReportDto,
} from '../presentation/dto/order.dto';
import { CreateOrderDto } from '../presentation/dto/create-order.dto';

import {
  CreateOrderResponseDto,
  OrderSummaryResponseDto,
  OrderTrackResponseDto,
  VendorActiveOrdersResponseDto,
  VendorOrderDetailResponseDto,
  CancelVendorOrderResponseDto,
  VendorOrderActionResponseDto,
  VendorPendingOrdersResponseDto,
  VendorOrderHistoryResponseDto,
  CreateOrderReportResponseDto,
  VendorOrderReportResponseDto,
} from '../presentation/dto/order.response.dto';

import { CustomerService } from '@/modules/customer/customer/application/customer.service';
import { CartService } from '@/modules/customer/cart/application/cart.service';
import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';
import { LocalStorageService } from '@/common/storage/local.storage.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { NotificationHelperService } from '@/common/shared/notification.service';

@Injectable()
export class OrderService {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepository: IOrderRepository,
    private readonly customerService: CustomerService,
    private readonly cartService: CartService,
    private readonly vendorService: VendorService,
    private readonly orderMapper: OrderMapper,
    private readonly localStorageService: LocalStorageService,
    private readonly notificationHelper: NotificationHelperService,
  ) {}

  // ============================================
  // CREATE ORDER
  // ============================================

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
    const estimatedReadyAt = this.calculateEstimatedReadyAt(cart);

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
      estimatedReadyAt,
      items: orderItems,
    });

    // ✅ Send notification to VENDOR about new order
    const vendor = await this.vendorService.execute(userId);
    if (vendor) {
      await this.notificationHelper.sendToUser(vendor.id, {
        title: `New Order #${order.orderNumber}`,
        body: `${orderItems.length} items • $${totalAmount.toFixed(2)}`,
        type: NotificationType.NEW_ORDER,
        channel: NotificationChannel.PUSH,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customer.id,
          totalAmount: totalAmount,
          itemCount: orderItems.length,
        },
      });
    }

    // ✅ Send notification to CUSTOMER about order confirmation
    await this.notificationHelper.sendToUser(userId, {
      title: 'Order Placed Successfully!',
      body: `Your order #${order.orderNumber} has been placed successfully.`,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        estimatedReadyAt: estimatedReadyAt,
      },
    });

    return OrderMapper.toCreateResponse(order);
  }

  private calculateEstimatedReadyAt(cart: any): Date {
    const now = new Date();

    const maxCookTime = Math.max(
      ...cart.items.map((item: any) => item.product.estimateCookTime ?? 10),
    );

    const totalQuantity = cart.items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );

    const quantityBuffer = Math.ceil(totalQuantity / 5) * 5;

    const estimatedMinutes = maxCookTime + quantityBuffer;

    return new Date(now.getTime() + estimatedMinutes * 60 * 1000);
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // ============================================
  // USER ORDER METHODS
  // ============================================

  async getUserOrderSummary(
    userId: string,
    orderId: string,
  ): Promise<OrderSummaryResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await this.orderRepository.findOrderSummaryById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customer.id) {
      throw new ForbiddenException('You cannot access this order');
    }

    return OrderMapper.toUserOrserSummaryResponse(order);
  }

  async getUserOrderTrack(
    userId: string,
    orderId: string,
  ): Promise<OrderTrackResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await this.orderRepository.findOrderTrackById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customer.id) {
      throw new ForbiddenException('You cannot access this order');
    }

    return OrderMapper.toTrackResponse(order);
  }

  async userCancelOrder(
    userId: string,
    orderId: string,
  ): Promise<OrderTrackResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await this.orderRepository.findOrderTrackById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customer.id) {
      throw new ForbiddenException('You cannot cancel this order');
    }

    if (!this.canCustomerCancel(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled when status is ${order.status}`,
      );
    }

    const cancelledOrder = await this.orderRepository.cancelOrder({
      orderId: order.id,
      cancelledAt: new Date(),
    });

    // ✅ Send notification to VENDOR about order cancellation
    const vendor = await this.vendorService.execute(userId);
    if (vendor) {
      await this.notificationHelper.sendToUser(vendor.id, {
        title: `Order #${order.orderNumber} Cancelled`,
        body: `Customer has cancelled their order.`,
        type: NotificationType.ORDER_CANCELLATION,
        channel: NotificationChannel.PUSH,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      });
    }

    // ✅ Send notification to CUSTOMER about cancellation confirmation
    await this.notificationHelper.sendToUser(userId, {
      title: 'Order Cancelled',
      body: `Your order #${order.orderNumber} has been cancelled successfully.`,
      type: NotificationType.ORDER_CANCELLATION,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return OrderMapper.toTrackResponse(cancelledOrder);
  }

  private canCustomerCancel(status: OrderStatus): boolean {
    return status === OrderStatus.PENDING || status === OrderStatus.CONFIRMED;
  }

  // ============================================
  // VENDOR ORDER METHODS
  // ============================================

  async getVendorActiveOrders(
    userId: string,
  ): Promise<VendorActiveOrdersResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const orders = await this.orderRepository.findActiveOrdersByVendorId(
      vendor.id,
    );

    return this.orderMapper.toVendorActiveOrdersResponse(orders, new Date());
  }

  async getVendorOrderDetail(
    userId: string,
    orderId: string,
  ): Promise<VendorOrderDetailResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const order = await this.orderRepository.findVendorOrderDetailById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot access this order');
    }

    return this.orderMapper.toVendorOrderDetailResponse(order);
  }

  async cancelVendorOrder(
    userId: string,
    orderId: string,
  ): Promise<CancelVendorOrderResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const order = await this.orderRepository.findVendorOrderForCancel(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot cancel this order');
    }

    if (!this.canVendorCancelOrder(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled when status is ${order.status}`,
      );
    }

    const cancelledOrder = await this.orderRepository.cancelVendorOrder({
      orderId: order.id,
      cancelledAt: new Date(),
    });

    // ✅ Send notification to CUSTOMER about vendor cancellation
    await this.notificationHelper.sendToUser(order.customerId, {
      title: `Order #${order.orderNumber} Cancelled by Vendor`,
      body: `The vendor has cancelled your order.`,
      type: NotificationType.ORDER_CANCELLATION,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return this.orderMapper.toCancelVendorOrderResponse(cancelledOrder);
  }

  private canVendorCancelOrder(status: OrderStatus): boolean {
    return status === OrderStatus.PENDING || status === OrderStatus.CONFIRMED;
  }

  async acceptVendorOrder(
    userId: string,
    orderId: string,
  ): Promise<VendorOrderActionResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const order = await this.orderRepository.findVendorOrderForAction(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot accept this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order cannot be accepted when status is ${order.status}`,
      );
    }

    const acceptedOrder = await this.orderRepository.acceptVendorOrder({
      orderId: order.id,
      confirmedAt: new Date(),
    });

    // ✅ Send notification to CUSTOMER about order acceptance
    await this.notificationHelper.sendToUser(order.customerId, {
      title: `Order #${order.orderNumber} Confirmed!`,
      body: `The vendor has accepted your order.`,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return this.orderMapper.toVendorOrderActionResponse(
      acceptedOrder,
      'Order accepted successfully.',
    );
  }

  async markVendorOrderReadyForPickup(
    userId: string,
    orderId: string,
  ): Promise<VendorOrderActionResponseDto> {
    const order = await this.getVendorOwnedOrderForAction(userId, orderId);

    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PREPARING
    ) {
      throw new BadRequestException(
        `Order cannot be marked ready for pickup when status is ${order.status}`,
      );
    }

    const readyOrder = await this.orderRepository.markVendorOrderReadyForPickup(
      {
        orderId: order.id,
        readyAt: new Date(),
      },
    );

    // ✅ Send notification to CUSTOMER about order ready for pickup
    await this.notificationHelper.sendToUser(order.customerId, {
      title: `Order #${order.orderNumber} Ready for Pickup!`,
      body: `Your order is ready for pickup. Please collect it soon.`,
      type: NotificationType.READY_FOR_PICKUP,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return this.orderMapper.toVendorOrderActionResponse(
      readyOrder,
      'Order marked as ready for pickup.',
    );
  }

  async completeVendorOrder(
    userId: string,
    orderId: string,
  ): Promise<VendorOrderActionResponseDto> {
    const order = await this.getVendorOwnedOrderForAction(userId, orderId);

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        `Order cannot be completed when status is ${order.status}`,
      );
    }

    const completedOrder = await this.orderRepository.completeVendorOrder({
      orderId: order.id,
      completedAt: new Date(),
    });

    // ✅ Send notification to CUSTOMER about order completion
    await this.notificationHelper.sendToUser(order.customerId, {
      title: `Order #${order.orderNumber} Completed`,
      body: `Your order has been completed. Thank you for ordering!`,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return this.orderMapper.toVendorOrderActionResponse(
      completedOrder,
      'Order completed successfully.',
    );
  }

  private async getVendorOwnedOrderForAction(
    userId: string,
    orderId: string,
  ): Promise<any> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const order = await this.orderRepository.findVendorOrderForAction(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot update this order');
    }

    return order;
  }

  async getVendorPendingOrders(
    userId: string,
  ): Promise<VendorPendingOrdersResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const orders = await this.orderRepository.findPendingOrdersByVendorId(
      vendor.id,
    );

    return this.orderMapper.toVendorPendingOrdersResponse(orders);
  }

  async getVendorOrderHistory(
    userId: string,
    query: VendorOrderHistoryQueryDto,
  ): Promise<VendorOrderHistoryResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const result = await this.orderRepository.findHistoryOrdersByVendorId(
      vendor.id,
      query,
    );

    return this.orderMapper.toVendorOrderHistoryResponse({
      total: result.total,
      completedCount: result.completedCount,
      cancelledCount: result.cancelledCount,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      items: result.items,
    });
  }

  // ============================================
  // ORDER REPORT METHODS
  // ============================================

  async createVendorOrderReport(
    userId: string,
    orderId: string,
    dto: CreateOrderReportDto,
    files?: Express.Multer.File[],
  ): Promise<CreateOrderReportResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const order = await this.orderRepository.findVendorOrderForReport(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot report this order');
    }

    if (!this.canVendorReportOrder(order.status)) {
      throw new BadRequestException(
        `Order cannot be reported when status is ${order.status}`,
      );
    }

    const existingReport = await this.orderRepository.findExistingOrderReport({
      orderId: order.id,
      vendorId: vendor.id,
    });

    if (existingReport) {
      throw new BadRequestException('This order has already been reported');
    }

    const imageUrls: string[] = [];

    if (files?.length) {
      const folder = `orders/reports/${order.id}`;

      const uploadedUrls = await Promise.all(
        files.map((file) => this.localStorageService.uploadFile(file, folder)),
      );

      imageUrls.push(...uploadedUrls);
    }

    const report = await this.orderRepository.createOrderReport({
      orderId: order.id,
      vendorId: vendor.id,
      customerId: order.customerId,
      reason: dto.reason,
      description: dto.description,
      imageUrls,
    });

    // ✅ Send notification to ADMIN about order report
    await this.notificationHelper.sendToRole('ADMIN', {
      title: `Order Report Created #${order.orderNumber}`,
      body: `A vendor has reported an order. Reason: ${dto.reason}`,
      type: NotificationType.CUSTOMER_REPORT,
      channel: NotificationChannel.PUSH,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        vendorId: vendor.id,
        reportId: report.id,
        reason: dto.reason,
      },
    });

    return this.orderMapper.toCreateOrderReportResponse(report);
  }

  private canVendorReportOrder(status: OrderStatus): boolean {
    return (
      status === OrderStatus.READY_FOR_PICKUP ||
      status === OrderStatus.COMPLETED ||
      status === OrderStatus.CANCELLED
    );
  }

  async getVendorOrderReport(
    userId: string,
    orderId: string,
  ): Promise<VendorOrderReportResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const report = await this.orderRepository.findVendorOrderReportByOrderId({
      orderId,
      vendorId: vendor.id,
    });

    if (!report) {
      throw new NotFoundException('Order report not found');
    }

    if (report.vendorId !== vendor.id) {
      throw new ForbiddenException('You cannot access this report');
    }

    return this.orderMapper.toVendorOrderReportResponse(report);
  }
}
