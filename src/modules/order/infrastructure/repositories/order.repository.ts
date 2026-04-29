import { Injectable } from '@nestjs/common';
import { Prisma, PaymentMethod } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateOrderFromCartInput, IOrderRepository } from '../../domain/interface/order.repository.interface';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrderFromCart(
    data: CreateOrderFromCartInput,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.create({
        data: {
          orderNumber: data.orderNumber,
          customerId: data.customerId,
          vendorId: data.vendorId,
          paymentMethod: data.paymentMethod as PaymentMethod,
          subtotal: data.subtotal,
          tax: data.tax,
          serviceFee: data.serviceFee,
          totalAmount: data.totalAmount,
          note: data.note,
        },
      });

      for (const item of data.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sizeName: item.sizeName,
            sizePrice: item.sizePrice,
            lineTotal: item.lineTotal,
          },
        });

        if (item.choiceOptions.length) {
          await tx.orderItemChoiceOption.createMany({
            data: item.choiceOptions.map((choice) => ({
              orderItemId: orderItem.id,
              choiceOptionId: choice.id,
              name: choice.name,
              price: choice.price,
            })),
          });
        }

        if (item.addOns.length) {
          await tx.orderItemAddOn.createMany({
            data: item.addOns.map((addOn) => ({
              orderItemId: orderItem.id,
              addOnId: addOn.id,
              name: addOn.name,
              price: addOn.price,
            })),
          });
        }
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: {
              orderItemChoiceOption: true,
              orderItemAddOn: true,
            },
          },
        },
      });
    });
  }
}