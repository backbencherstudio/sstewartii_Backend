import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  IsString,
} from 'class-validator';
import { 
  VerificationStatus,
  VendorAdminStatus,
 } from '@prisma/client';

import { KycStatus, SubscriptionStatus } from '@prisma/client';

export enum VendorVerificationSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class VendorVerificationListQueryDto {
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus = VerificationStatus.PENDING;

  @IsOptional()
  @IsEnum(VendorVerificationSort)
  sort?: VendorVerificationSort = VendorVerificationSort.NEWEST;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export enum AdminVendorVerificationDocumentType {
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  HEALTH_PERMIT = 'HEALTH_PERMIT',
  INSURANCE_PROOF = 'INSURANCE_PROOF',
}

export class VendorVerificationDocumentParamDto {
  @IsEnum(AdminVendorVerificationDocumentType)
  documentType!: AdminVendorVerificationDocumentType;
}

export enum DashboardRange {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class AdminDashboardOverviewQueryDto {
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange = DashboardRange.MONTH;
}

export enum DashboardRevenueRange {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum DashboardRevenueMetric {
  REVENUE = 'revenue',
  SALES = 'sales',
}

export enum AdminVendorAccountSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

export class AdminDashboardRevenueQueryDto {
  @IsOptional()
  @IsEnum(DashboardRevenueRange)
  range?: DashboardRevenueRange = DashboardRevenueRange.YEAR;

  @IsOptional()
  @IsEnum(DashboardRevenueMetric)
  metric?: DashboardRevenueMetric = DashboardRevenueMetric.REVENUE;
}

export class AdminVendorAccountListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(AdminVendorAccountSort)
  sort?: AdminVendorAccountSort = AdminVendorAccountSort.NEWEST;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export enum AdminVendorOverviewRange {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class AdminVendorAccountOverviewQueryDto {
  @IsOptional()
  @IsEnum(AdminVendorOverviewRange)
  range?: AdminVendorOverviewRange = AdminVendorOverviewRange.MONTH;
}

export enum AdminVendorOrderStatusFilter {
  ALL = 'ALL',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AdminVendorOrderSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  AMOUNT_HIGH = 'amount_high',
  AMOUNT_LOW = 'amount_low',
}

export class AdminVendorAccountOrdersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AdminVendorOrderStatusFilter)
  status?: AdminVendorOrderStatusFilter = AdminVendorOrderStatusFilter.ALL;

  @IsOptional()
  @IsEnum(AdminVendorOrderSort)
  sort?: AdminVendorOrderSort = AdminVendorOrderSort.NEWEST;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class UpdateVendorStatusDto {
  status!: VendorAdminStatus;
  reason?: string;
}