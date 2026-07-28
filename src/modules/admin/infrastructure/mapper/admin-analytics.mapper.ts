import { Injectable } from '@nestjs/common';

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
  toSummaryResponse(data: {
    platformGrowth: {
      series: any[];
      totalVendors: number;
      totalCustomers: number;
    };
    subscriberGrowth: { series: any[]; totalSubscribers: number };
    leaderboard: { customers: any[]; vendors: any[] };
  }) {
    return {
      platformGrowth: {
        series: data.platformGrowth.series,
        totalVendors: data.platformGrowth.totalVendors,
        totalCustomers: data.platformGrowth.totalCustomers,
      },
      subscriberGrowth: {
        series: data.subscriberGrowth.series,
        totalSubscribers: data.subscriberGrowth.totalSubscribers,
      },
      leaderboard: {
        customers: data.leaderboard.customers,
        vendors: data.leaderboard.vendors,
      },
    };
  }
}