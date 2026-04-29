import { CreateOrderResponseDto } from '../../presentation/dto/order.response.dto';

export class OrderMapper {
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
}