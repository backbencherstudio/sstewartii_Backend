import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { OrderReportReason } from '@prisma/client';

import type {
  IAdminCustomerRepository,
  FindAllCustomersParams,
} from '../../domain/interface/admin.customer.repository.interface';

import {
  CustomerOrderHistoryQueryDto,
  CustomerReportQueueQueryDto,
} from '../../presentation/dto/customer-query.dto';
import {
  CustomerRawData,
  ReportQueueRawData,
  CustomerVendorReportsRawData,
  CustomerVendorReportsRawData1,
} from '../mapper/admin.customer.mapper';

type VendorReportsRaw = {
  vendor: {
    id: string;
    vendorCode: string;
    businessName: string | null;
    coverImage: string | null;
  };
  reports: {
    id: string;
    createdAt: Date;
  }[];
};

type OrderReportRaw = {
  id: string;
  reason: OrderReportReason;
  description: string | null;
  status: string;
  createdAt: Date;
};

@Injectable()
export class AdminCustomerRepository implements IAdminCustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: FindAllCustomersParams) {
    const { where, page, limit, orderBy } = params;

    const [data, stats, total] = await Promise.all([
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
      this.getCustomerStats(),
      this.prisma.customer.count({ where }),
    ]);

    // Map the customers to the format you want
    const mappedCustomers = data.map((customer) => {
      const totalSpent = customer.orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0,
      );

      return {
        id: customer.id,
        name: customer.user?.name,
        email: customer.user?.email,
        status: customer.isActive ? 'ACTIVE' : 'INACTIVE',
        dateJoined: customer.createdAt,
        orders: customer.orders.length,
        totalSpent: totalSpent,
      };
    });

    // Return the restructured data
    return {
      data: {
        customers: mappedCustomers,
        total: total,
        stats: stats,
      },
    };
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

    const [customer, orderStats, orders, orderCount, lastOrder, reportsFiled] =
      await Promise.all([
        this.prisma.customer.findUnique({
          where: { id: customerId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
        }),

        this.prisma.order.groupBy({
          by: ['status'],
          where: { customerId },
          _count: { status: true },
          _sum: { totalAmount: true },
        }),

        this.prisma.order.findMany({
          where: orderWhere,
          include: {
            vendor: {
              select: {
                businessName: true,
                publicEmail: true,
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
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),

        this.prisma.orderReport.count({
          where: { customerId },
        }),
      ]);

    return {
      customer: customer!,
      orderStats: orderStats,
      orders,
      orderCount,
      lastOrderedAt: lastOrder?.createdAt ?? null,
      reportsFiled,
    };
  }

  async findReportQueue(
    query: CustomerReportQueueQueryDto,
  ): Promise<ReportQueueRawData> {
    const { search, sortBy } = query;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          customer: {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          },
        }
      : {};

    const grouped = await this.prisma.orderReport.groupBy({
      by: ['customerId'],
      where: searchFilter,
      _count: { customerId: true },
    });

    if (!grouped.length) {
      return { items: [], total: 0 };
    }

    const customerIds = grouped.map((g) => g.customerId);

    const vendorCounts = await this.prisma.orderReport.groupBy({
      by: ['customerId', 'vendorId'],
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
        id: true,
        avatar: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    let items = grouped
      .filter((g) => customerMap.has(g.customerId))
      .map((g) => ({
        customerId: g.customerId,
        reportCount: g._count.customerId,
        vendorCount: vendorCountMap.get(g.customerId) ?? 0,
        customer: customerMap.get(g.customerId)!,
      }));

    if (sortBy === 'most_reports') {
      items.sort((a, b) => b.reportCount - a.reportCount);
    }

    const total = items.length;

    items = items.slice(skip, skip + limit);

    return { items, total };
  }

  async findReportDetail(customerId: string) {
    const [
      customer,
      vendorReportGroups,
      totalReportCount,
      lastOrder,
      allReports,
    ] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          avatar: true,
          dateOfBirth: true,
          address: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),

      this.prisma.orderReport.groupBy({
        by: ['vendorId'],
        where: { customerId },
        _count: { vendorId: true },
      }),

      this.prisma.orderReport.count({
        where: { customerId },
      }),

      this.prisma.order.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),

      // Fetch all reports with full details
      this.prisma.orderReport.findMany({
        where: { customerId },
        select: {
          id: true,
          vendorId: true,
          reason: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          reviewedAt: true,
          resolvedAt: true,
          adminNote: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!customer) return null;

    const vendorIds = vendorReportGroups.map((g) => g.vendorId);

    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: {
        id: true,
        vendorCode: true,
        businessName: true,
        coverImage: true,
      },
    });

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    // Group reports by vendor
    const reportsByVendor = new Map<
      string,
      Array<{
        id: string;
        reason: string;
        description: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        reviewedAt: Date | null;
        resolvedAt: Date | null;
        adminNote: string | null;
      }>
    >();

    for (const report of allReports) {
      const existing = reportsByVendor.get(report.vendorId) ?? [];
      existing.push({
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reviewedAt: report.reviewedAt,
        resolvedAt: report.resolvedAt,
        adminNote: report.adminNote,
      });
      reportsByVendor.set(report.vendorId, existing);
    }

    const vendorGroups = vendorReportGroups
      .filter((g) => vendorMap.has(g.vendorId))
      .map((g) => ({
        vendorId: g.vendorId,
        reportCount: g._count.vendorId,
        vendor: vendorMap.get(g.vendorId)!,
        reports: reportsByVendor.get(g.vendorId) ?? [],
      }));

    return {
      customer,
      vendorGroups,
      totalReportCount,
      lastOrderedAt: lastOrder?.createdAt ?? null,
    };
  }

  async findCustomerVendorReports(
    customerId: string,
  ): Promise<CustomerVendorReportsRawData | null> {
    const customerExists = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customerExists) return null;

    const vendorIds = await this.prisma.orderReport
      .findMany({
        where: { customerId },
        select: { vendorId: true },
        distinct: ['vendorId'],
      })
      .then((rows) => rows.map((r) => r.vendorId));

    if (!vendorIds.length) return { vendorGroups: [] };

    const [vendors, reports] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: {
          id: true,
          vendorCode: true,
          businessName: true,
          coverImage: true,
        },
      }),

      this.prisma.orderReport.findMany({
        where: { customerId },
        select: {
          id: true,
          vendorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    const reportsByVendor = new Map<
      string,
      { id: string; createdAt: Date }[]
    >();

    for (const report of reports) {
      const existing = reportsByVendor.get(report.vendorId) ?? [];
      existing.push({ id: report.id, createdAt: report.createdAt });
      reportsByVendor.set(report.vendorId, existing);
    }

    const vendorGroups: VendorReportsRaw[] = vendorIds
      .filter((id) => vendorMap.has(id))
      .map((id) => ({
        vendor: vendorMap.get(id)!,
        reports: reportsByVendor.get(id) ?? [],
      }));

    return { vendorGroups };
  }

  async findCustomerVendorReports2(
    customerId: string,
    vendorId: string,
  ): Promise<CustomerVendorReportsRawData1 | null> {
    // Check if customer exists
    const customerExists = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customerExists) return null;

    // Check if vendor exists
    const vendorExists = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendorExists) return null;

    // Get vendor details
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        vendorCode: true,
        businessName: true,
        coverImage: true,
      },
    });

    if (!vendor) return null;

    // Get all reports for this customer and vendor
    const reports = await this.prisma.orderReport.findMany({
      where: {
        customerId,
        vendorId,
      },
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // If no reports found, return empty
    if (!reports.length) {
      return {
        vendorGroups: [],
      };
    }

    // Map reports to the expected format
    const reportItems: OrderReportRaw[] = reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
    }));

    // Return the vendor with its reports
    return {
      vendorGroups: [
        {
          vendor: {
            id: vendor.id,
            vendorCode: vendor.vendorCode,
            businessName: vendor.businessName,
            coverImage: vendor.coverImage,
          },
          reports: reportItems,
        },
      ],
    };
  }

  async findActiveStatus(customerId: string): Promise<{ isActive: boolean }> {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { isActive: true },
    });
  }

  async deactivateCustomer(customerId: string): Promise<void> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false },
    });
  }

  private async getCustomerStats() {
    const now = new Date();

    const [totalCustomers, activeUsers, reportedCustomers, suspendedCustomers] =
      await Promise.all([
        // Total customers
        this.prisma.customer.count(),

        // Active users (customers with at least one order in the last 30 days)
        this.prisma.customer.count({
          where: {
            orders: {
              some: {
                createdAt: {
                  gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                },
              },
            },
          },
        }),

        // Reported customers (customers with order reports)
        this.prisma.customer.count({
          where: {
            orderReports: {
              some: {
                status: 'OPEN',
              },
            },
          },
        }),

        // Suspended customers (you might want to add a 'suspended' field to Customer model)
        // For now, checking if customer has any cancelled orders or specific status
        this.prisma.customer.count({
          where: {
            orders: {
              some: {
                status: 'CANCELLED',
              },
            },
          },
        }),
      ]);

    return {
      totalCustomers,
      activeUsers,
      reportedCustomers,
      suspendedCustomers,
      lastUpdated: now,
    };
  }
}
