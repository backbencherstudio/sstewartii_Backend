import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { VerificationStatus } from '@prisma/client';

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

export class AdminDashboardRevenueQueryDto {
  @IsOptional()
  @IsEnum(DashboardRevenueRange)
  range?: DashboardRevenueRange = DashboardRevenueRange.YEAR;

  @IsOptional()
  @IsEnum(DashboardRevenueMetric)
  metric?: DashboardRevenueMetric = DashboardRevenueMetric.REVENUE;
}