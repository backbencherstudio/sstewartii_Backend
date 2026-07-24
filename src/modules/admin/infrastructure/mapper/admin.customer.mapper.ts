/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/unbound-method */
import {
  Prisma,
  OrderStatus,
  OrderReportReason,
} from '@prisma/client';

import { Injectable } from '@nestjs/common';

import { CustomerListItemDto } from '../../presentation/dto/admin.response.dto';
import {
  CustomerOrderHistoryDto,
  CustomerReportQueueItemDto,
} from '../../presentation/dto/customer-detail.response.dto';
import {
  CustomerDetailResponseDto,
  CustomerReportQueueResponseDto,
  CustomerReportDetailResponseDto,
  ReportingVendorDto,
  ReportItemDto,
  VendorReportGroupDto,
  VendorReportGroupDto2,
  CustomerVendorReportsResponseDto,
  ReportDetailItemDto,
  CustomerVendorReportsResponseDto2,
} from '../../presentation/dto/customer-detail.response.dto';

import { MediaService } from '@/common/media/media.service';

export interface RevenueChartItem {
  label: string;
  value: number;
}

export type VendorSubscriptionWithPlan = Prisma.VendorSubscriptionGetPayload<{
  include: { subscriptionPlan: true };
}>;

type CustomerWithUser = Prisma.CustomerGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        createdAt: true;
      };
    };
  };
}>;

type OrderWithVendor = Prisma.OrderGetPayload<{
  include: {
    vendor: {
      select: {
        businessName: true;
        publicEmail: true;
      };
    };
  };
}>;

type OrderStatGroup = {
  status: OrderStatus;
  _count: { status: number };
  _sum: { totalAmount: number | null };
};

export interface CustomerRawData {
  customer: CustomerWithUser;
  orderStats: OrderStatGroup[];
  orders: OrderWithVendor[];
  orderCount: number;
  lastOrderedAt: Date | null;
  reportsFiled: number;
}

type ReportQueueRaw = {
  customerId: string;
  reportCount: number;
  vendorCount: number;
  customer: {
    id: string;
    avatar: string | null;
    user: {
      name: string | null;
      email: string;
    };
  };
};

type ReportDetailRaw = {
  customer: {
    id: string;
    avatar: string | null;
    dateOfBirth: Date | null;
    address: string | null;
    user: {
      name: string | null;
      email: string;
    };
    orders: {
      status: string;
    }[];
  };
  vendorGroups: {
    vendorId: string;
    reportCount: number;
    vendor: {
      id: string;
      vendorCode: string;
      businessName: string | null;
      coverImage: string | null;
    };
  }[];
  totalReportCount: number;
  lastOrderedAt: Date | null;
};

export interface CustomerReportDetailRawData {
  customer: ReportDetailRaw['customer'];
  vendorGroups: ReportDetailRaw['vendorGroups'];
  totalReportCount: number;
  lastOrderedAt: Date | null;
}

export interface ReportQueueRawData {
  items: ReportQueueRaw[];
  total: number;
}

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

export interface CustomerVendorReportsRawData {
  vendorGroups: VendorReportsRaw[];
}

type OrderReportRaw = {
  id: string;
  reason: OrderReportReason;
  description: string | null;
  status: string;
  createdAt: Date;
};

type VendorReportsRaw1 = {
  vendor: {
    id: string;
    vendorCode: string;
    businessName: string | null;
    coverImage: string | null;
  };
  reports: OrderReportRaw[];
};

export interface CustomerVendorReportsRawData1 {
  vendorGroups: VendorReportsRaw1[];
}

const REASON_LABEL: Record<OrderReportReason, string> = {
  CUSTOMER_NO_SHOW: 'Customer did not arrive',
  CUSTOMER_UNREACHABLE: 'Unable to contact customer',
  FAKE_ORDER: 'Fake order placed',
  PAYMENT_ISSUE: 'Payment issue',
  ABUSIVE_BEHAVIOR: 'Abusive behavior',
  WRONG_ORDER_CLAIM: 'Wrong order claim',
  OTHER: 'Other',
};

@Injectable()
export class AdminCustomerMapper {
  constructor(private readonly mediaService: MediaService) {}

  toListItem(entity: any): CustomerListItemDto {
    const totalSpent = entity.orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );

    return {
      id: entity.id,
      name: entity.user?.name,
      email: entity.user?.email,
      status: this.mapStatus(entity),
      dateJoined: entity.createdAt,
      orders: entity.orders.length,
      totalSpent,
    };
  }

  toPaginated(result: { data: any[]; total: number }) {
    return {
      data: result.data.map((item) => this.toListItem(item)),
      total: result.total,
    };
  }

  mapStatus(entity: any): string {
    if (!entity.isActive) return 'SUSPENDED';

    if (entity.orderReports?.length > 0) return 'REPORTED';

    return 'ACTIVE';
  }

  static toOrderHistory(order: OrderWithVendor): CustomerOrderHistoryDto {
    const createdAt = new Date(order.createdAt);
    const dto = new CustomerOrderHistoryDto();
    dto.orderId = order.id;
    dto.orderNumber = order.orderNumber;
    dto.vendorName = order.vendor.businessName ?? 'Unknown';
    dto.vendorEmail = order.vendor.publicEmail ?? '';
    dto.totalAmount = order.totalAmount;
    dto.status = order.status;

    dto.date = createdAt.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    dto.time = createdAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return dto;
  }

  toDetailResponse(
    raw: CustomerRawData,
    page: number,
    limit: number,
  ): CustomerDetailResponseDto {
    const {
      customer,
      orderStats,
      orders,
      orderCount,
      lastOrderedAt,
      reportsFiled,
    } = raw;

    const getCount = (s: OrderStatus): number =>
      orderStats.find((g) => g.status === s)?._count?.status ?? 0;

    const totalSpent = orderStats
      .filter((g) => g.status === OrderStatus.COMPLETED)
      .reduce((sum, g) => sum + (g._sum?.totalAmount ?? 0), 0);

    const totalOrders = orderStats.reduce(
      (sum, g) => sum + (g._count?.status ?? 0),
      0,
    );

    const dto = new CustomerDetailResponseDto();

    dto.id = customer.id;
    dto.userId = customer.userId;
    dto.fullName = customer.user.name ?? '';
    dto.email = customer.user.email;
    dto.avatar = customer.avatar;
    dto.dateOfBirth = customer.dateOfBirth;
    dto.cityOfResidence = customer.address;
    dto.phoneNumber = customer.phoneNumber;
    dto.joinedAt = customer.user.createdAt;
    dto.totalOrders = totalOrders;
    dto.totalSpent = totalSpent;
    dto.completedOrders = getCount(OrderStatus.COMPLETED);
    dto.cancelledOrders = getCount(OrderStatus.CANCELLED);
    dto.incompleteOrders = getCount(OrderStatus.PENDING);
    dto.reportsFiled = reportsFiled;
    dto.lastOrderedAt = lastOrderedAt;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    dto.orders = orders.map(AdminCustomerMapper.toOrderHistory);
    dto.orderTotal = orderCount;
    dto.orderPage = page;
    dto.orderLimit = limit;

    return dto;
  }

  toReportQueueItem(raw: ReportQueueRaw): CustomerReportQueueItemDto {
    const dto = new CustomerReportQueueItemDto();
    dto.customerId = raw.customer.id;
    dto.customerCode = `#${raw.customerId.slice(0, 6).toUpperCase()}`;
    dto.fullName = raw.customer.user.name ?? 'Unknown';
    dto.email = raw.customer.user.email;
    dto.avatar = raw.customer.avatar;
    dto.reportCount = raw.reportCount;
    dto.vendorCount = raw.vendorCount;
    return dto;
  }

  toReportQueueResponse(
    raw: ReportQueueRawData,
    page: number,
    limit: number,
  ): CustomerReportQueueResponseDto {
    const dto = new CustomerReportQueueResponseDto();
    dto.data = raw.items.map(this.toReportQueueItem);
    dto.total = raw.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }

  toReportingVendor(raw: {
    vendorId: string;
    reportCount: number;
    vendor: {
      id: string;
      vendorCode: string;
      businessName: string | null;
      coverImage: string | null;
    };
  }): ReportingVendorDto {
    const dto = new ReportingVendorDto();
    dto.vendorId = raw.vendor.id;
    dto.vendorCode = `${raw.vendor.vendorCode}`;
    dto.businessName = raw.vendor.businessName ?? 'Unknown';
    dto.coverImage = raw.vendor.coverImage;
    dto.reportCount = raw.reportCount;
    return dto;
  }

  toReportDetail(
    raw: CustomerReportDetailRawData,
  ): CustomerReportDetailResponseDto {
    const { customer, vendorGroups, totalReportCount, lastOrderedAt } = raw;

    const getCount = (status: string): number =>
      customer.orders.filter((o) => o.status === status).length;

    const dto = new CustomerReportDetailResponseDto();

    dto.customerId = customer.id;
    dto.customerCode = `#${customer.id.slice(0, 5).toUpperCase()}`;
    dto.fullName = customer.user.name ?? 'Unknown';
    dto.avatar = customer.avatar;
    dto.completedOrders = getCount('COMPLETED');
    dto.cancelledOrders = getCount('CANCELLED');
    dto.incompleteOrders = getCount('PENDING');
    dto.reportCount = totalReportCount;
    dto.vendorCount = vendorGroups.length;
    dto.lastOrderedAt = lastOrderedAt;

    dto.vendors = vendorGroups
      .map(this.toReportingVendor)
      .sort((a, b) => b.reportCount - a.reportCount);

    return dto;
  }

  toReportItem(
report: { id: string; createdAt: Date; }, i: number,
  ): ReportItemDto {
    const dto = new ReportItemDto();
    dto.reportId = report.id;
    dto.reportNumber = `#${report.id.slice(0, 5).toUpperCase()}`;
    dto.createdAt = report.createdAt;
    dto.displayDate = new Date(report.createdAt)
      .toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-');
    return dto;
  }

  toVendorReportGroup(raw: VendorReportsRaw): VendorReportGroupDto {
    const dto = new VendorReportGroupDto();

    dto.vendorId = raw.vendor.id;
    dto.vendorCode = `${raw.vendor.vendorCode}`;
    dto.businessName = raw.vendor.businessName ?? 'Unknown';
    dto.coverImage = raw.vendor.coverImage;
    dto.reportCount = raw.reports.length;
    dto.reports = raw.reports.map((r, i) => this.toReportItem(r, i));
    return dto;
  }

  toCustomerVendorReports(
    raw: CustomerVendorReportsRawData,
  ): CustomerVendorReportsResponseDto {
    const dto = new CustomerVendorReportsResponseDto();
    dto.vendors = raw.vendorGroups
      .map(this.toVendorReportGroup)
      .sort((a, b) => b.reportCount - a.reportCount);
    return dto;
  }

  toReportDetailItem(raw: OrderReportRaw): ReportDetailItemDto {
    const dto = new ReportDetailItemDto();

    dto.reportId = raw.id;
    dto.reportNumber = `#${raw.id.slice(0, 5).toUpperCase()}`;
    dto.reason = REASON_LABEL[raw.reason] ?? raw.reason;
    dto.description = raw.description;
    dto.status = raw.status;
    dto.createdAt = raw.createdAt;
    dto.displayDate = new Date(raw.createdAt)
      .toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-');
    return dto;
  }

  toVendorReportGroup1(raw: VendorReportsRaw1): VendorReportGroupDto2 {
    const dto = new VendorReportGroupDto2();

    dto.vendorId = raw.vendor.id;
    dto.vendorCode = `#${raw.vendor.vendorCode}`;
    dto.businessName = raw.vendor.businessName ?? 'Unknown';
    dto.coverImage = raw.vendor.coverImage;
    dto.reportCount = raw.reports.length;
    dto.reports = raw.reports
      .map((r) => this.toReportDetailItem(r))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    return dto;
  }

  toCustomerVendorReports1(
    raw: CustomerVendorReportsRawData1,
  ): CustomerVendorReportsResponseDto2 {
    const dto = new CustomerVendorReportsResponseDto2();
    dto.vendors = raw.vendorGroups
      .map((r) => this.toVendorReportGroup1(r))
      .sort((a, b) => b.reportCount - a.reportCount);
    return dto;
  }
}
