import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { 
  Customer,
 } from '@prisma/client';

import type {
 IAdminCustomerRepository,
 FindAllCustomersParams
} from '../../domain/interface/admin.customer.repository.interface';

import { 
  VendorVerificationSort,
 } from '../../presentation/dto/admin.dto';
 import { 
  CustomerOrderHistoryQueryDto,
  CustomerReportQueueQueryDto,
 } from '../../presentation/dto/customer-query.dto';
 import { 
  CustomerRawData,
  ReportQueueRawData,
 } from '../mapper/admin.customer.mapper';

@Injectable()
export class AdminCustomerRepository
  implements IAdminCustomerRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: FindAllCustomersParams) {
    const { where, page, limit, orderBy } = params;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          orders: {
            select: {
              totalAmount: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total };
  }

  async existsById(customerId: string): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: { id: customerId },
    });
    return count > 0;
  }

  async findRawCustomerData(
    customerId: string,
    query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerRawData> {
    const { status, sortBy } = query;
    
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const orderWhere = {
      customerId,
      ...(status && { status }),
    };

    const [
      customer,
      orderStats,
      orders,
      orderCount,
      lastOrder,
      reportsFiled,
    ] = await Promise.all([

      this.prisma.customer.findUnique({
        where:   { id: customerId },
        include: {
          user: {
            select: {
              id:        true,
              name:      true,
              email:     true,
              createdAt: true,
            },
          },
        },
      }),

      this.prisma.order.groupBy({
        by:    ['status'],
        where: { customerId },
        _count: { status: true },
        _sum:   { totalAmount: true },
      }),

      this.prisma.order.findMany({
        where: orderWhere,
        include: {
          vendor: {
            select: {
              businessName: true,
              publicEmail:  true,
            },
          },
        },
        orderBy: { createdAt: sortBy === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),

      this.prisma.order.count({
        where: orderWhere,
      }),

      this.prisma.order.findFirst({
        where:   { customerId },
        orderBy: { createdAt: 'desc' },
        select:  { createdAt: true },
      }),

      this.prisma.orderReport.count({
        where: { customerId },
      }),
    ]);

    return {
      customer:     customer!,
      orderStats:   orderStats as any,
      orders,
      orderCount,
      lastOrderedAt: lastOrder?.createdAt ?? null,
      reportsFiled,
    };
  }

  async findReportQueue(
    query: CustomerReportQueueQueryDto,
  ): Promise<ReportQueueRawData> {
    const { search, sortBy} = query;
    
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          customer: {
            user: {
              OR: [
                { name:  { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          },
        }
      : {};

    const orderBy =
      sortBy === 'oldest'
        ? { createdAt: 'asc'  as const }
        : { createdAt: 'desc' as const };

    const grouped = await this.prisma.orderReport.groupBy({
      by:    ['customerId'],
      where: searchFilter,
      _count: { customerId: true },
    });

    if (!grouped.length) {
      return { items: [], total: 0 };
    }

    const customerIds = grouped.map((g) => g.customerId);

    const vendorCounts = await this.prisma.orderReport.groupBy({
      by:    ['customerId', 'vendorId'],
      where: { customerId: { in: customerIds } },
      _count: { vendorId: true },
    });

    const vendorCountMap = new Map<string, number>();
    for (const row of vendorCounts) {
      const current = vendorCountMap.get(row.customerId) ?? 0;
      vendorCountMap.set(row.customerId, current + 1);
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id:     true,
        avatar: true,
        user: {
          select: {
            name:  true,
            email: true,
          },
        },
      },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    let items = grouped
      .filter((g) => customerMap.has(g.customerId))
      .map((g) => ({
        customerId:  g.customerId,
        reportCount: g._count.customerId,
        vendorCount: vendorCountMap.get(g.customerId) ?? 0,
        customer:    customerMap.get(g.customerId)!,
      }));

    if (sortBy === 'most_reports') {
      items.sort((a, b) => b.reportCount - a.reportCount);
    }

    const total = items.length;

    items = items.slice(skip, skip + limit);

    return { items, total };
  }
}