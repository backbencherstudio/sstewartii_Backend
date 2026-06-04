import { 
  VerificationStatus,
  Prisma,
  Customer,
  OrderStatus
} from '@prisma/client';

import { 
    Injectable,
    NotFoundException,
 } from '@nestjs/common';

 
import type {
  VendorVerificationListResult,
} from '../../domain/interface/admin.repository.interface';

import {
  AdminVendorVerificationDocumentType,
} from '../../presentation/dto/admin.dto';
import {
  CustomerListItemDto,
} from '../../presentation/dto/admin.response.dto';
import { CustomerOrderHistoryDto } from '../../presentation/dto/customer-detail.response.dto';
import { CustomerDetailResponseDto } from '../../presentation/dto/customer-detail.response.dto';

import { MediaService } from '@/common/media/media.service';

export interface RevenueChartItem {
  label: string;
  value: number;
}

export type VendorSubscriptionWithPlan =
  Prisma.VendorSubscriptionGetPayload<{
    include: { subscriptionPlan: true };
}>;

type CustomerWithUser = Prisma.CustomerGetPayload<{
  include: {
    user: {
      select: {
        id:        true;
        name:      true;
        email:     true;
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
        publicEmail:  true;
      };
    };
  };
}>;

type OrderStatGroup = {
  status: OrderStatus;
  _count: { status: number };
  _sum:   { totalAmount: number | null };
};

export interface CustomerRawData {
  customer:     CustomerWithUser;
  orderStats:   OrderStatGroup[];
  orders:       OrderWithVendor[];
  orderCount:   number;
  lastOrderedAt: Date | null;
  reportsFiled: number;
}


@Injectable()
export class AdminCustomerMapper {
 constructor(private readonly mediaService: MediaService) {}

  toListItem(entity: any): CustomerListItemDto {
    const totalSpent = entity.orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
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

  toPaginated(
    result: { data: any[]; total: number }
  ) {
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
    const dto       = new CustomerOrderHistoryDto();

    dto.orderId     = order.id;
    dto.orderNumber = order.orderNumber;
    dto.vendorName  = order.vendor.businessName ?? 'Unknown';
    dto.vendorEmail = order.vendor.publicEmail  ?? '';
    dto.totalAmount = order.totalAmount;
    dto.status      = order.status;

    dto.date = createdAt.toLocaleDateString('en-US', {
      month: 'long',
      day:   'numeric',
      year:  'numeric',
    });

    dto.time = createdAt.toLocaleTimeString('en-US', {
      hour:    'numeric',
      minute:  '2-digit',
      hour12:  true,
    });

    return dto;
  }

  toDetailResponse(
    raw:   CustomerRawData,
    page:  number,
    limit: number,
  ): CustomerDetailResponseDto {
    const { customer, orderStats, orders, orderCount, lastOrderedAt, reportsFiled } = raw;

    const getCount = (s: OrderStatus): number =>
      orderStats.find((g) => g.status === s)?._count?.status ?? 0;

    const totalSpent = orderStats
      .filter((g) => g.status === OrderStatus.COMPLETED)
      .reduce((sum, g) => sum + (g._sum?.totalAmount ?? 0), 0);

    const totalOrders = orderStats.reduce(
      (sum, g) => sum + (g._count?.status ?? 0),
      0,
    );

    const dto                = new CustomerDetailResponseDto();

    dto.id                   = customer.id;
    dto.userId               = customer.userId;
    dto.fullName             = customer.user.name  ?? '';
    dto.email                = customer.user.email;
    dto.avatar               = customer.avatar;
    dto.dateOfBirth          = customer.dateOfBirth;
    dto.cityOfResidence      = customer.address;
    dto.phoneNumber          = customer.phoneNumber;
    dto.joinedAt             = customer.user.createdAt;
    dto.totalOrders          = totalOrders;
    dto.totalSpent           = totalSpent;
    dto.completedOrders      = getCount(OrderStatus.COMPLETED);
    dto.cancelledOrders      = getCount(OrderStatus.CANCELLED);
    dto.incompleteOrders     = getCount(OrderStatus.PENDING);
    dto.reportsFiled         = reportsFiled;
    dto.lastOrderedAt        = lastOrderedAt;
    dto.orders               = orders.map(AdminCustomerMapper.toOrderHistory);
    dto.orderTotal           = orderCount;
    dto.orderPage            = page;
    dto.orderLimit           = limit;

    return dto;
  }
}

