import { Injectable } from '@nestjs/common';
import { Prisma, PaymentMethod, OrderStatus } from '@prisma/client';
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
          estimatedReadyAt: data.estimatedReadyAt,
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

  async findOrderSummaryById(orderId: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        vendor: {
          include: {
            serviceArea: true,
          },
        },
        orderItems: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            orderItemChoiceOption: true,
            orderItemAddOn: true,
          },
        },
      },
    });
  }

  async findOrderTrackById(orderId: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        customer: true,
        vendor: {
          include: {
            serviceArea: true,
          },
        },
      },
    });
  }

  async cancelOrder(data: {
    orderId: string;
    cancelledAt: Date;
  }): Promise<any> {
    return this.prisma.order.update({
      where: {
        id: data.orderId,
      },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: data.cancelledAt,
      },
      include: {
        vendor: {
          include: {
            serviceArea: true,
          },
        },
      },
    });
  }

  async findActiveOrdersByVendorId(vendorId: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: {
        vendorId,
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
          ],
        },
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        orderItems: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            orderItemChoiceOption: true,
            orderItemAddOn: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async findVendorOrderDetailById(orderId: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            ownerId: true,
            businessName: true,
          },
        },
        orderItems: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            orderItemChoiceOption: true,
            orderItemAddOn: true,
          },
        },
      },
    });
  }
}