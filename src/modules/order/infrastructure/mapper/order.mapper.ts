import { Injectable } from '@nestjs/common';

import { 
  OrderStatus,
  OrderReportReason,
  OrderReportStatus,
} from '@prisma/client';

import { 
  CreateOrderResponseDto,
  OrderSummaryResponseDto,
  OrderTrackResponseDto,
  OrderTrackStepDto,
  VendorActiveOrdersResponseDto,
  VendorOrderDetailResponseDto,
  CancelVendorOrderResponseDto,
  VendorOrderActionResponseDto,
  VendorPendingOrdersResponseDto,
  VendorOrderHistoryResponseDto,
  CreateOrderReportResponseDto,
  VendorOrderReportResponseDto,
} from '../../presentation/dto/order.response.dto';

import { MediaService } from '@/common/media/media.service';

@Injectable()
export class OrderMapper {
  constructor(private readonly mediaService:MediaService){}

  static toCreateResponse(order: any): CreateOrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      vendorId: order.vendorId,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,
      estimatedReadyAt: order.estimatedReadyAt ?? null,
      createdAt: order.createdAt,
      orderItems: order.orderItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sizeName: item.sizeName ?? undefined,
        sizePrice: item.sizePrice,
        lineTotal: item.lineTotal,
        choiceOptions: item.orderItemChoiceOption.map((choice: any) => ({
          id: choice.id,
          choiceOptionId: choice.choiceOptionId,
          name: choice.name,
          price: choice.price,
        })),
        addOns: item.orderItemAddOn.map((addon: any) => ({
          id: addon.id,
          addOnId: addon.addOnId,
          name: addon.name,
          price: addon.price,
        })),
      })),
    };
  }

  static toUserOrserSummaryResponse(order: any): OrderSummaryResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      estimatedReadyAt: order.estimatedReadyAt ?? null,

      vendor: {
        id: order.vendor.id,
        businessName: order.vendor.businessName ?? 'Unnamed Vendor',
        contactNumber: order.vendor.contactNumber ?? undefined,
        address: order.vendor.serviceArea?.address ?? undefined,
        latitude: order.vendor.serviceArea?.latitude ?? undefined,
        longitude: order.vendor.serviceArea?.longitude ?? undefined,
      },

      items: order.orderItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sizeName: item.sizeName ?? undefined,
        sizePrice: item.sizePrice,
        lineTotal: item.lineTotal,

        choiceOptions: item.orderItemChoiceOption.map((choice: any) => ({
          id: choice.id,
          name: choice.name,
          price: choice.price,
        })),

        addOns: item.orderItemAddOn.map((addon: any) => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        })),
      })),

      subtotal: order.subtotal,
      tax: order.tax,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,
      note: order.note ?? undefined,
      createdAt: order.createdAt,
    };
  }

static toTrackResponse(order: any): OrderTrackResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,

      placedAt: order.createdAt,
      estimatedReadyAt: order.estimatedReadyAt ?? null,

      customerLocation: {
        latitude: order.customer?.latitude ?? undefined,
        longitude: order.customer?.longitude ?? undefined,
        address: order.customer?.address ?? undefined,
      },

      vendor: {
        id: order.vendor.id,
        businessName: order.vendor.businessName ?? 'Unnamed Vendor',
        contactNumber: order.vendor.contactNumber ?? undefined,
        address: order.vendor.serviceArea?.address ?? undefined,
        latitude: order.vendor.serviceArea?.latitude ?? undefined,
        longitude: order.vendor.serviceArea?.longitude ?? undefined,
      },

      timeline: OrderMapper.buildTrackTimeline(order),

      canCancel: OrderMapper.canCancelOrder(order.status),

      totalAmount: order.totalAmount,
    };
  }

  private static buildTrackTimeline(order: any): OrderTrackStepDto[] {
    const status = order.status as OrderStatus;

    const isCancelled = status === OrderStatus.CANCELLED;

    const orderConfirmedDone =
      status === OrderStatus.PENDING ||
      status === OrderStatus.CONFIRMED ||
      status === OrderStatus.PREPARING ||
      status === OrderStatus.READY_FOR_PICKUP ||
      status === OrderStatus.COMPLETED ||
      status === OrderStatus.CANCELLED;

    const preparingDone =
      status === OrderStatus.PREPARING ||
      status === OrderStatus.READY_FOR_PICKUP ||
      status === OrderStatus.COMPLETED;

    const readyDone =
      status === OrderStatus.READY_FOR_PICKUP ||
      status === OrderStatus.COMPLETED;

    const completedDone = status === OrderStatus.COMPLETED;

    const timeline: OrderTrackStepDto[] = [
      {
        status: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        description: isCancelled
          ? 'Your order was received before cancellation.'
          : 'Your order has been received.',
        isCompleted: orderConfirmedDone,
        isCurrent:
          status === OrderStatus.PENDING ||
          status === OrderStatus.CONFIRMED,
        timestamp: order.confirmedAt ?? order.createdAt,
        estimatedTime: null,
      },
      {
        status: 'PREPARING',
        title: 'Preparing your food',
        description: 'Chef is preparing your food.',
        isCompleted: preparingDone,
        isCurrent: status === OrderStatus.PREPARING,
        timestamp: order.preparingAt ?? null,
        estimatedTime: order.estimatedReadyAt ?? null,
      },
      {
        status: 'READY_FOR_PICKUP',
        title: 'Ready for Pickup',
        description: 'Your food is ready to pickup.',
        isCompleted: readyDone,
        isCurrent: status === OrderStatus.READY_FOR_PICKUP,
        timestamp: order.readyAt ?? null,
        estimatedTime: order.estimatedReadyAt ?? null,
      },
      {
        status: 'COMPLETED',
        title: 'Completed',
        description: 'Enjoy your meal!',
        isCompleted: completedDone,
        isCurrent: status === OrderStatus.COMPLETED,
        timestamp: order.completedAt ?? null,
        estimatedTime: null,
      },
    ];

    if (isCancelled) {
      timeline.push({
        status: 'CANCELLED',
        title: 'Cancelled',
        description: 'This order was cancelled.',
        isCompleted: true,
        isCurrent: true,
        timestamp: order.cancelledAt ?? null,
        estimatedTime: null,
      });
    }

    return timeline;
  }

  private static canCancelOrder(status: OrderStatus): boolean {
    return (
      status === OrderStatus.PENDING ||
      status === OrderStatus.CONFIRMED
    );
  }

 toVendorActiveOrdersResponse(
    orders: any[],
    now: Date = new Date(),
  ): VendorActiveOrdersResponseDto {
    return {
      total: orders.length,
      items: orders.map((order) => {
        const itemCount = order.orderItems.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );

        const uniqueItemCount = order.orderItems.length;

        const timeMeta = OrderMapper.getVendorOrderTimeMeta(order, now);

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,

          customer: {
            id: order.customer.id,
            name:
              order.customer.user?.name ??
              order.customer.user?.email ??
              'Customer',
            imageUrl: this.mediaService.getUrl(order.customer.avatar),
          },

          items: order.orderItems.map((item: any) =>
            OrderMapper.toVendorActiveOrderItem(item),
          ),

          itemCount,
          uniqueItemCount,
          itemSummaryLabel: OrderMapper.buildItemSummaryLabel(itemCount),

          totalAmount: order.totalAmount,

          createdAt: order.createdAt,
          estimatedReadyAt: order.estimatedReadyAt ?? null,

          statusLabel: OrderMapper.getVendorOrderStatusLabel(order.status),
          actionLabel: OrderMapper.getVendorOrderActionLabel(order.status),

          timeLabel: timeMeta.timeLabel,
          isLate: timeMeta.isLate,
          minutesLate: timeMeta.minutesLate,
          minutesLeft: timeMeta.minutesLeft,
        };
      }),
    };
  }

  private static toVendorActiveOrderItem(item: any) {
    const choiceOptions = item.orderItemChoiceOption.map((choice: any) => ({
      id: choice.id,
      choiceOptionId: choice.choiceOptionId,
      name: choice.name,
      price: choice.price,
    }));

    const addOns = item.orderItemAddOn.map((addon: any) => ({
      id: addon.id,
      addOnId: addon.addOnId,
      name: addon.name,
      price: addon.price,
    }));

    const optionNames = [
      item.sizeName,
      ...choiceOptions.map((choice: any) => choice.name),
      ...addOns.map((addon: any) => addon.name),
    ].filter(Boolean);

    return {
      id: item.id,

      productName: item.productName,
      quantity: item.quantity,

      unitPrice: item.unitPrice,

      sizeName: item.sizeName ?? undefined,
      sizePrice: item.sizePrice,

      choiceOptions,
      addOns,

      lineTotal: item.lineTotal,

      displayText: optionNames.length
        ? `${item.quantity} x ${item.productName} (${optionNames.join(', ')})`
        : `${item.quantity} x ${item.productName}`,
    };
  }

  private static buildItemSummaryLabel(itemCount: number): string {
    const itemWord = itemCount === 1 ? 'item' : 'items';

    return `${itemCount} ${itemWord} in single order`;
  }

  private static getVendorOrderStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'New Order';

      case OrderStatus.CONFIRMED:
      case OrderStatus.PREPARING:
        return 'Preparing';

      case OrderStatus.READY_FOR_PICKUP:
        return 'Ready For Pickup';

      default:
        return status;
    }
  }

  private static getVendorOrderActionLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Accept Order';

      case OrderStatus.CONFIRMED:
      case OrderStatus.PREPARING:
        return 'Ready for pickup';

      case OrderStatus.READY_FOR_PICKUP:
        return 'Complete Order';

      default:
        return 'View Details';
    }
  }

  private static getVendorOrderTimeMeta(
    order: any,
    now: Date,
  ): {
    timeLabel: string;
    isLate: boolean;
    minutesLate: number;
    minutesLeft: number;
  } {
    if (order.status === OrderStatus.PENDING) {
      return {
        timeLabel: OrderMapper.formatTime(order.createdAt),
        isLate: false,
        minutesLate: 0,
        minutesLeft: 0,
      };
    }

    if (order.status === OrderStatus.READY_FOR_PICKUP) {
      return {
        timeLabel: 'Ready now',
        isLate: false,
        minutesLate: 0,
        minutesLeft: 0,
      };
    }

    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.PREPARING
    ) {
      if (!order.estimatedReadyAt) {
        return {
          timeLabel: 'Preparing',
          isLate: false,
          minutesLate: 0,
          minutesLeft: 0,
        };
      }

      const estimatedReadyAt = new Date(order.estimatedReadyAt);

      const diffMinutes = Math.ceil(
        (estimatedReadyAt.getTime() - now.getTime()) / 60000,
      );

      if (diffMinutes < 0) {
        const minutesLate = Math.abs(diffMinutes);

        return {
          timeLabel: `${minutesLate} min late`,
          isLate: true,
          minutesLate,
          minutesLeft: 0,
        };
      }

      return {
        timeLabel: `${diffMinutes} min left`,
        isLate: false,
        minutesLate: 0,
        minutesLeft: diffMinutes,
      };
    }

    return {
      timeLabel: '',
      isLate: false,
      minutesLate: 0,
      minutesLeft: 0,
    };
  }

  private static formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  }

  toVendorOrderDetailResponse(
    order: any,
  ): VendorOrderDetailResponseDto {
    const itemCount = order.orderItems.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );

    const uniqueItemCount = order.orderItems.length;

    return {
      id: order.id,
      orderNumber: order.orderNumber,

      status: order.status,
      statusLabel: OrderMapper.getVendorOrderDetailStatusLabel(order.status),

      paymentMethod: order.paymentMethod,

      customer: {
        id: order.customer.id,
        name:
          order.customer.user?.name ??
          order.customer.user?.email ??
          'Customer',
        email: order.customer.user?.email ?? undefined,
        imageUrl: this.mediaService.getUrl(order.customer.avatar),
          
        customerSince: order.customer.createdAt,
      },

      items: order.orderItems.map((item: any) =>
        OrderMapper.toVendorOrderDetailItem(item),
      ),

      itemCount,
      uniqueItemCount,
      itemSummaryLabel: OrderMapper.buildItemSummaryLabel1(itemCount),

      subtotal: order.subtotal,
      tax: order.tax,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,

      note: order.note ?? undefined,

      createdAt: order.createdAt,
      estimatedReadyAt: order.estimatedReadyAt ?? null,
      confirmedAt: order.confirmedAt ?? null,
      readyAt: order.readyAt ?? null,
      completedAt: order.completedAt ?? null,
      cancelledAt: order.cancelledAt ?? null,

      timeline: OrderMapper.buildVendorOrderDetailTimeline(order),

      actions: OrderMapper.buildVendorOrderActions(order.status),
    };
  }

  private static toVendorOrderDetailItem(item: any) {
    const choiceOptions = item.orderItemChoiceOption.map((choice: any) => ({
      id: choice.id,
      choiceOptionId: choice.choiceOptionId,
      name: choice.name,
      price: choice.price,
    }));

    const addOns = item.orderItemAddOn.map((addon: any) => ({
      id: addon.id,
      addOnId: addon.addOnId,
      name: addon.name,
      price: addon.price,
    }));

    const optionNames = [
      item.sizeName,
      ...choiceOptions.map((choice: any) => choice.name),
      ...addOns.map((addon: any) => addon.name),
    ].filter(Boolean);

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,

      quantity: item.quantity,

      unitPrice: item.unitPrice,

      sizeName: item.sizeName ?? undefined,
      sizePrice: item.sizePrice,

      choiceOptions,
      addOns,

      lineTotal: item.lineTotal,

      displayText: optionNames.length
        ? `${item.quantity} x ${item.productName} (${optionNames.join(', ')})`
        : `${item.quantity} x ${item.productName}`,

      optionSummary: optionNames.length
        ? optionNames.join(' • ')
        : undefined,
    };
  }

  private static buildItemSummaryLabel1(itemCount: number): string {
    const itemWord = itemCount === 1 ? 'item' : 'items';

    return `${itemCount} ${itemWord} in single order`;
  }

  private static getVendorOrderDetailStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'New Order';

      case OrderStatus.CONFIRMED:
      case OrderStatus.PREPARING:
        return 'Preparing';

      case OrderStatus.READY_FOR_PICKUP:
        return 'Ready For Pickup';

      case OrderStatus.COMPLETED:
        return 'Completed';

      case OrderStatus.CANCELLED:
        return 'Cancelled';

      default:
        return status;
    }
  }

  private static buildVendorOrderDetailTimeline(order: any) {
    const status = order.status as OrderStatus;

    const isCancelled = status === OrderStatus.CANCELLED;

    return [
      {
        key: 'ORDER_PLACED' as const,
        title: 'Order placed',
        isCompleted: true,
        isCurrent: status === OrderStatus.PENDING,
        timestamp: order.createdAt,
      },
      {
        key: 'ORDER_CONFIRMED' as const,
        title: 'Order confirmed',
        isCompleted:
          status === OrderStatus.CONFIRMED ||
          status === OrderStatus.PREPARING ||
          status === OrderStatus.READY_FOR_PICKUP ||
          status === OrderStatus.COMPLETED,
        isCurrent:
          status === OrderStatus.CONFIRMED ||
          status === OrderStatus.PREPARING,
        timestamp: order.confirmedAt ?? null,
      },
      {
        key: 'READY_FOR_PICKUP' as const,
        title: 'Ready for pickup',
        isCompleted:
          status === OrderStatus.READY_FOR_PICKUP ||
          status === OrderStatus.COMPLETED,
        isCurrent: status === OrderStatus.READY_FOR_PICKUP,
        timestamp: order.readyAt ?? null,
      },
      {
        key: 'PICKED_UP_BY_CUSTOMER' as const,
        title: 'Order picked up by customer',
        isCompleted: status === OrderStatus.COMPLETED,
        isCurrent: false,
        timestamp: null,
      },
      {
        key: 'ORDER_COMPLETED' as const,
        title: 'Order completed',
        isCompleted: status === OrderStatus.COMPLETED,
        isCurrent: status === OrderStatus.COMPLETED,
        timestamp: order.completedAt ?? null,
      },
      ...(isCancelled
        ? [
            {
              key: 'ORDER_CANCELLED' as const,
              title: 'Order cancelled',
              isCompleted: true,
              isCurrent: true,
              timestamp: order.cancelledAt ?? null,
            },
          ]
        : []),
    ];
  }

  private static buildVendorOrderActions(status: OrderStatus) {
    return {
      canAccept: status === OrderStatus.PENDING,

      canCancel:
        status === OrderStatus.PENDING ||
        status === OrderStatus.CONFIRMED,

      canMarkReadyForPickup:
        status === OrderStatus.CONFIRMED ||
        status === OrderStatus.PREPARING,

      canComplete: status === OrderStatus.READY_FOR_PICKUP,

      canReportIncomplete: status === OrderStatus.READY_FOR_PICKUP,
    };
  }

  toCancelVendorOrderResponse(order: any): CancelVendorOrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      cancelledAt: order.cancelledAt,
    };
  }

  toVendorOrderActionResponse(
    order: any,
    message: string,
  ): VendorOrderActionResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      confirmedAt: order.confirmedAt ?? null,
      preparingAt: order.preparingAt ?? null,
      readyAt: order.readyAt ?? null,
      completedAt: order.completedAt ?? null,
      cancelledAt: order.cancelledAt ?? null,
      message,
    };
  }

  toVendorPendingOrdersResponse(
    orders: any[],
  ): VendorPendingOrdersResponseDto {
    return {
      total: orders.length,
      items: orders.map((order) => {
        const itemCount = order.orderItems.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );

        const uniqueItemCount = order.orderItems.length;

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,

          customer: {
            id: order.customer.id,
            name:
              order.customer.user?.name ??
              order.customer.user?.email ??
              'Customer',
            imageUrl: this.mediaService.getUrl(order.customer.avatar),
          },

          items: order.orderItems.map((item: any) =>
            this.toVendorPendingOrderItem(item),
          ),

          itemCount,
          uniqueItemCount,
          itemSummaryLabel: this.buildPendingItemSummaryLabel(uniqueItemCount),

          subtotal: order.subtotal,
          totalAmount: order.totalAmount,

          createdAt: order.createdAt,
          timeLabel: this.formatTime(order.createdAt),

          statusLabel: 'New Order',
          actionLabel: 'Accept Order',
        };
      }),
    };
  }

  private toVendorPendingOrderItem(item: any) {
    const choiceOptions = item.orderItemChoiceOption ?? [];
    const addOns = item.orderItemAddOn ?? [];

    const optionNames = [
      item.sizeName,
      ...choiceOptions.map((choice: any) => choice.name),
      ...addOns.map((addon: any) => addon.name),
    ].filter(Boolean);

    return {
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      sizeName: item.sizeName ?? undefined,
      lineTotal: item.lineTotal,

      displayText: optionNames.length
        ? `${item.quantity} x ${item.productName} (${optionNames.join(', ')})`
        : `${item.quantity} x ${item.productName}`,
    };
  }

  private buildPendingItemSummaryLabel(uniqueItemCount: number): string {
    const itemWord = uniqueItemCount === 1 ? 'item' : 'items';

    return `${uniqueItemCount} ${itemWord}`;
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  }

  toVendorOrderHistoryResponse(data: {
    total: number;
    page: number;
    limit: number;
    completedCount: number;
    cancelledCount: number;
    items: any[];
  }): VendorOrderHistoryResponseDto {
    return {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages:
        data.total === 0 ? 0 : Math.ceil(data.total / data.limit),

      completedCount: data.completedCount,
      cancelledCount: data.cancelledCount,

      items: data.items.map((order) => {
        const itemCount = order.orderItems.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );

        const uniqueItemCount = order.orderItems.length;

        return {
          id: order.id,
          orderNumber: order.orderNumber,

          status: order.status,
          statusLabel: this.getVendorHistoryStatusLabel(order.status),

          customer: {
            id: order.customer.id,
            name:
              order.customer.user?.name ??
              order.customer.user?.email ??
              'Customer',
            imageUrl: this.mediaService.getUrl(order.customer.avatar),
          },

          items: order.orderItems.map((item: any) =>
            this.toVendorHistoryOrderItem(item),
          ),

          itemCount,
          uniqueItemCount,
          itemSummaryLabel: this.buildHistoryItemSummaryLabel(uniqueItemCount),

          subtotal: order.subtotal,
          totalAmount: order.totalAmount,

          createdAt: order.createdAt,
          completedAt: order.completedAt ?? null,
          cancelledAt: order.cancelledAt ?? null,

          timeLabel: this.getVendorHistoryTimeLabel(order),

          canViewDetails: true,
        };
      }),
    };
  }

  private toVendorHistoryOrderItem(item: any) {
    const choiceOptions = item.orderItemChoiceOption ?? [];
    const addOns = item.orderItemAddOn ?? [];

    const optionNames = [
      item.sizeName,
      ...choiceOptions.map((choice: any) => choice.name),
      ...addOns.map((addon: any) => addon.name),
    ].filter(Boolean);

    return {
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      sizeName: item.sizeName ?? undefined,
      lineTotal: item.lineTotal,

      displayText: optionNames.length
        ? `${item.quantity} x ${item.productName} (${optionNames.join(', ')})`
        : `${item.quantity} x ${item.productName}`,
    };
  }

  private getVendorHistoryStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'Completed';

      case OrderStatus.CANCELLED:
        return 'Cancelled';

      default:
        return status;
    }
  }

  private buildHistoryItemSummaryLabel(uniqueItemCount: number): string {
    const itemWord = uniqueItemCount === 1 ? 'item' : 'items';

    return `${uniqueItemCount} ${itemWord}`;
  }

  private getVendorHistoryTimeLabel(order: any): string {
    if (order.status === OrderStatus.COMPLETED && order.completedAt) {
      return this.formatTime(order.completedAt);
    }

    if (order.status === OrderStatus.CANCELLED && order.cancelledAt) {
      return this.formatTime(order.cancelledAt);
    }

    return this.formatTime(order.createdAt);
  }

  toCreateOrderReportResponse(report: any): CreateOrderReportResponseDto {
    return {
      id: report.id,

      orderId: report.orderId,
      orderNumber: report.order?.orderNumber ?? '',

      vendorId: report.vendorId,
      customerId: report.customerId,

      reason: report.reason,
      description: report.description ?? undefined,

      status: report.status,

      images: report.images.map((image: any) => ({
        id: image.id,
        imageUrl: this.mediaService.getUrl(image.imageUrl),
        position: image.position,
      })),

      createdAt: report.createdAt,
    };
  }

  toVendorOrderReportResponse(report: any): VendorOrderReportResponseDto {
    return {
      id: report.id,

      reportingId: this.buildReportDisplayId(report.id),

      orderId: report.orderId,
      orderNumber: report.order?.orderNumber ?? '',

      vendorId: report.vendorId,
      customerId: report.customerId,

      reason: report.reason,
      reasonLabel: this.getOrderReportReasonLabel(report.reason),

      description: report.description ?? undefined,

      status: report.status,
      statusLabel: this.getOrderReportStatusLabel(report.status),

      images: report.images.map((image: any) => ({
        id: image.id,
        imageUrl: this.mediaService.getUrl(image.imageUrl),
        position: image.position,
      })),

      submittedAt: report.createdAt,
      submittedLabel: this.getSubmittedLabel(report.createdAt),

      reviewedAt: report.reviewedAt ?? null,
      resolvedAt: report.resolvedAt ?? null,
      adminNote: report.adminNote ?? undefined,
    };
  }

  private buildReportDisplayId(reportId: string): string {
    const clean = reportId.replace(/-/g, '').slice(0, 5).toUpperCase();

    return `REP-${clean}`;
  }

  private getOrderReportReasonLabel(reason: OrderReportReason): string {
    switch (reason) {
      case OrderReportReason.CUSTOMER_NO_SHOW:
        return 'Customer No-Show';

      case OrderReportReason.CUSTOMER_UNREACHABLE:
        return 'Customer Unreachable';

      case OrderReportReason.FAKE_ORDER:
        return 'Fake Order';

      case OrderReportReason.PAYMENT_ISSUE:
        return 'Payment Issue';

      case OrderReportReason.ABUSIVE_BEHAVIOR:
        return 'Abusive Behavior';

      case OrderReportReason.WRONG_ORDER_CLAIM:
        return 'Wrong Order Claim';

      case OrderReportReason.OTHER:
      default:
        return 'Other';
    }
  }

  private getOrderReportStatusLabel(status: OrderReportStatus): string {
    switch (status) {
      case OrderReportStatus.OPEN:
        return 'Submitted';

      case OrderReportStatus.IN_REVIEW:
        return 'In Review';

      case OrderReportStatus.RESOLVED:
        return 'Resolved';

      case OrderReportStatus.REJECTED:
        return 'Rejected';

      default:
        return status;
    }
  }

  private getSubmittedLabel(createdAt: Date): string {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Submitted just now';
    }

    if (diffMinutes < 60) {
      return `Submitted ${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `Submitted ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    return `Submitted on ${new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(createdAt))}`;
  }
}