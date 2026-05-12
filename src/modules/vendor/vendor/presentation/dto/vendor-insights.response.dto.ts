import { SubscriptionStatus } from '@prisma/client';

export class InsightPeriodDto {
  month!: string;
  label!: string;
  startDate!: Date;
  endDate!: Date;
}

export class InsightTrendPointDto {
  day!: number;
  value!: number;
}

export class RevenueOverviewDto {
  total!: number;
  previousTotal!: number;
  changePercent!: number;
  trend!: InsightTrendPointDto[];
}

export class ProfileViewsOverviewDto {
  total!: number;
  previousTotal!: number;
  changePercent!: number;
  trend!: InsightTrendPointDto[];
}

export class RatingDistributionDto {
  1!: number;
  2!: number;
  3!: number;
  4!: number;
  5!: number;
}

export class RatingOverviewDto {
  average!: number;
  reviewCount!: number;
  distribution!: RatingDistributionDto;
}

export class FavoriteOverviewDto {
  count!: number;
}

export class SubscriptionOverviewDto {
  status!: SubscriptionStatus;
  planName?: string | null;
  expiresAt?: Date | null;
  isActive!: boolean;
  showUpgradeCard!: boolean;
  upgradeTitle!: string;
  upgradeDescription!: string;
}

export class VendorInsightsOverviewResponseDto {
  period!: InsightPeriodDto;
  revenue!: RevenueOverviewDto;
  profileViews!: ProfileViewsOverviewDto;
  rating!: RatingOverviewDto;
  favorites!: FavoriteOverviewDto;
  subscription!: SubscriptionOverviewDto;
}

export class RevenueChartPeriodDto {
  month!: string;
  label!: string;
  startDate!: Date;
  endDate!: Date;
}

export class RevenueChartPointDto {
  day!: number;
  date!: string;
  revenue!: number;
  orderCount!: number;
}

export class RevenueChartSummaryDto {
  totalRevenue!: number;
  previousRevenue!: number;
  changePercent!: number;

  completedOrderCount!: number;
  averageDailyRevenue!: number;

  bestDay!: {
    day: number;
    date: string;
    revenue: number;
    orderCount: number;
  } | null;
}

export class VendorRevenueChartResponseDto {
  period!: RevenueChartPeriodDto;
  summary!: RevenueChartSummaryDto;
  chart!: RevenueChartPointDto[];
}