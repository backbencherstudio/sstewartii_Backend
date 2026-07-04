import { Injectable } from '@nestjs/common';
import { Prisma, PaymentMethod, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateOrderFromCartInput,
  IOrderRepository,
  CreateOrderReportInput,
} from '../../domain/interface/order.repository.interface';

import {
  VendorOrderHistoryQueryDto,
  VendorOrderHistoryStatusFilter,
} from '../../presentation/dto/order.dto';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrderFromCart(data: CreateOrderFromCartInput): Promise<any> {
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
          estimatedReadyAt: 'asc',
        },
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

  async findVendorOrderForCancel(orderId: string): Promise<any | null> {
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

  async cancelVendorOrder(data: {
    orderId: string;
    cancelledAt: Date;
  }): Promise<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    cancelledAt: Date | null;
  }> {
    return this.prisma.order.update({
      where: {
        id: data.orderId,
      },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: data.cancelledAt,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        cancelledAt: true,
      },
    });
  }

  async findVendorOrderForAction(orderId: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        vendorId: true,
        status: true,
        confirmedAt: true,
        preparingAt: true,
        readyAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
  }

  async acceptVendorOrder(data: {
    orderId: string;
    confirmedAt: Date;
  }): Promise<any> {
    return this.prisma.order.update({
      where: {
        id: data.orderId,
      },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: data.confirmedAt,
        preparingAt: data.confirmedAt,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        confirmedAt: true,
        preparingAt: true,
        readyAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
  }

  async markVendorOrderReadyForPickup(data: {
    orderId: string;
    readyAt: Date;
  }): Promise<any> {
    return this.prisma.order.update({
      where: {
        id: data.orderId,
      },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
        readyAt: data.readyAt,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        confirmedAt: true,
        preparingAt: true,
        readyAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
  }

  async completeVendorOrder(data: {
    orderId: string;
    completedAt: Date;
  }): Promise<any> {
    return this.prisma.order.update({
      where: {
        id: data.orderId,
      },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: data.completedAt,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        confirmedAt: true,
        preparingAt: true,
        readyAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
  }

  async findPendingOrdersByVendorId(vendorId: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: {
        vendorId,
        status: OrderStatus.PENDING,
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
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findHistoryOrdersByVendorId(
    vendorId: string,
    query: VendorOrderHistoryQueryDto,
  ): Promise<{
    total: number;
    completedCount: number;
    cancelledCount: number;
    items: any[];
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const historyStatuses =
      query.status === VendorOrderHistoryStatusFilter.COMPLETED
        ? [OrderStatus.COMPLETED]
        : query.status === VendorOrderHistoryStatusFilter.CANCELLED
          ? [OrderStatus.CANCELLED]
          : [OrderStatus.COMPLETED, OrderStatus.CANCELLED];

    const where: Prisma.OrderWhereInput = {
      vendorId,
      status: {
        in: historyStatuses,
      },
    };

    const andConditions: Prisma.OrderWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          {
            orderNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            customer: {
              user: {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            customer: {
              user: {
                email: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const baseCountWhere: Prisma.OrderWhereInput = {
      vendorId,
      status: {
        in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      },
    };

    const [total, completedCount, cancelledCount, items] = await Promise.all([
      this.prisma.order.count({
        where,
      }),

      this.prisma.order.count({
        where: {
          ...baseCountWhere,
          status: OrderStatus.COMPLETED,
        },
      }),

      this.prisma.order.count({
        where: {
          ...baseCountWhere,
          status: OrderStatus.CANCELLED,
        },
      }),

      this.prisma.order.findMany({
        where,
        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip,
        take: limit,
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
      }),
    ]);

    return {
      total,
      completedCount,
      cancelledCount,
      items,
    };
  }

  async findVendorOrderForReport(orderId: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        vendorId: true,
        customerId: true,
        status: true,
      },
    });
  }

  async findExistingOrderReport(data: {
    orderId: string;
    vendorId: string;
  }): Promise<{ id: string } | null> {
    return this.prisma.orderReport.findUnique({
      where: {
        orderId_vendorId: {
          orderId: data.orderId,
          vendorId: data.vendorId,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async createOrderReport(data: CreateOrderReportInput): Promise<any> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.orderReport.create({
        data: {
          orderId: data.orderId,
          vendorId: data.vendorId,
          customerId: data.customerId,
          reason: data.reason,
          description: data.description,
        },
      });

      if (data.imageUrls?.length) {
        await tx.orderReportImage.createMany({
          data: data.imageUrls.map((imageUrl, index) => ({
            reportId: report.id,
            imageUrl,
            position: index,
          })),
        });
      }

      return tx.orderReport.findUnique({
        where: {
          id: report.id,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          images: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
    });
  }

  async findVendorOrderReportByOrderId(data: {
    orderId: string;
    vendorId: string;
  }): Promise<any | null> {
    return this.prisma.orderReport.findUnique({
      where: {
        orderId_vendorId: {
          orderId: data.orderId,
          vendorId: data.vendorId,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        images: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }
}
