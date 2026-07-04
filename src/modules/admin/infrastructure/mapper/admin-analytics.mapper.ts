import { Injectable } from '@nestjs/common';

import { AnalyticsSummaryResponseDto } from '../../presentation/dto/analytics-summary.response.dto';

export interface AnalyticsSummaryRawData {
  totalVendors: number;
  totalCustomers: number;
  totalSubscribers: number;
  platformRevenue: number;
}

export interface MonthlyCountRaw {
  month: Date;
  count: bigint;
}

export interface PlatformGrowthRawData {
  vendorGrowth: MonthlyCountRaw[];
  customerGrowth: MonthlyCountRaw[];
}

@Injectable()
export class AdminAnalyticsMapper {
  toSummaryResponse(raw: AnalyticsSummaryRawData): AnalyticsSummaryResponseDto {
    const dto = new AnalyticsSummaryResponseDto();
    dto.totalVendors = raw.totalVendors;
    dto.totalCustomers = raw.totalCustomers;
    dto.totalSubscribers = raw.totalSubscribers;
    dto.platformRevenue = Number(raw.platformRevenue.toFixed(2));
    dto.updatedAt = new Date();
    return dto;
  }
}
