import { 
  VerificationStatus,
  Prisma,
  Customer,
} from '@prisma/client';

import { 
    Injectable,
    NotFoundException,
 } from '@nestjs/common';

import {
  AdminVendorVerificationDocumentType,
} from '../../presentation/dto/admin.dto';
import {
  CustomerListItemDto,
} from '../../presentation/dto/admin.response.dto';

import type {
  VendorVerificationListResult,
} from '../../domain/interface/admin.repository.interface';

import { MediaService } from '@/common/media/media.service';

export interface RevenueChartItem {
  label: string;
  value: number;
}

export type VendorSubscriptionWithPlan =
  Prisma.VendorSubscriptionGetPayload<{
    include: { subscriptionPlan: true };
}>;

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
}

