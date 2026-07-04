import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

import { OrderReportReason } from '@prisma/client';

export enum VendorOrderHistoryStatusFilter {
  ALL = 'ALL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class VendorOrderHistoryQueryDto {
  @IsOptional()
  @IsEnum(VendorOrderHistoryStatusFilter)
  status?: VendorOrderHistoryStatusFilter = VendorOrderHistoryStatusFilter.ALL;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class CreateOrderReportDto {
  @IsEnum(OrderReportReason)
  reason!: OrderReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
