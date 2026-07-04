export type VendorInsightPlan = 'FREE' | 'TRIAL' | 'STARTER' | 'PRO' | 'ELITE';

export class VendorInsightAccessDto {
  plan!: VendorInsightPlan;

  canViewRevenue!: boolean;
  canViewPeakHours!: boolean;
  canViewOrderDistribution!: boolean;
  canViewCustomerEngagement!: boolean;
  canViewTopDishes!: boolean;
  canViewTopCustomers!: boolean;
  canViewTopSpots!: boolean;
  canViewProfileViews!: boolean;
  canViewRatings!: boolean;
  canViewFavorites!: boolean;
  canViewAiGuidance!: boolean;
  canViewEvents!: boolean;

  upgradeRequired!: boolean;
  upgradePlan?: 'PRO' | 'ELITE';
  lockedMessage?: string;
}

export class VendorLockedInsightSectionDto {
  key!: string;
  title!: string;
  requiredPlan!: 'PRO' | 'ELITE';
  message!: string;
}

export class VendorInsightMetricDto {
  label!: string;
  value!: number | string;
  changePercent?: number;
  changeLabel?: string;
}

export class VendorRevenuePointDto {
  label!: string;
  value!: number;
}

export class VendorPeakHourPointDto {
  time!: string;
  orderCount!: number;
  trafficLevel!: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class VendorOrderDistributionDto {
  totalOrders!: number;
  completedOrders!: number;
  cancelledOrders!: number;
  pendingOrders!: number;
  itemsSold!: number;
  completedPercent!: number;
  cancelledPercent!: number;
}

export class VendorCustomerEngagementDto {
  totalCustomers!: number;
  newCustomers!: number;
  repeatCustomers!: number;
  repeatRate!: number;
}

export class VendorTopDishDto {
  productId!: string;
  name!: string;
  orderCount!: number;
  quantitySold!: number;
  revenue!: number;
}

export class VendorTopCustomerDto {
  customerId!: string;
  name!: string;
  orderCount!: number;
  totalSpent!: number;
}

export class VendorTopSpotDto {
  id!: string;
  name!: string;
  orderCount!: number;
  revenue!: number;
}

export class VendorRatingSummaryDto {
  rating!: number;
  reviewCount!: number;
}

export class VendorInsightsOverviewResponseDto {
  access!: VendorInsightAccessDto;

  range!: 'today' | 'week' | 'month' | 'year';
  startDate!: Date;
  endDate!: Date;

  emptyState!: boolean;

  revenueSummary?: VendorInsightMetricDto;
  revenueChart?: VendorRevenuePointDto[];

  peakHours?: VendorPeakHourPointDto[];

  profileViews?: VendorInsightMetricDto;
  averageRating?: VendorRatingSummaryDto;
  favorites?: VendorInsightMetricDto;

  orderDistribution?: VendorOrderDistributionDto;
  customerEngagement?: VendorCustomerEngagementDto;

  topDishes?: VendorTopDishDto[];
  topCustomers?: VendorTopCustomerDto[];
  topSpots?: VendorTopSpotDto[];

  lockedSections!: VendorLockedInsightSectionDto[];
}

export class VendorAiSalesByLocationDto {
  locationId!: string;
  locationName!: string;
  address?: string | null;
  totalSales!: number;
  totalOrders!: number;
  latitude?: number;
  longitude?: number;
}

export class VendorAiTopSellingItemDto {
  productId!: string;
  productName!: string;
  quantitySold!: number;
  orderCount!: number;
  revenue!: number;
  rank!: number;
}

export class VendorAiRecommendedActionDto {
  title!: string;
  description!: string;
  actionLabel!: string;
  confidence!: 'LOW' | 'MEDIUM' | 'HIGH';
  source!: string;
}

export class VendorAiLiveHotZoneDto {
  title!: string;
  locationName!: string;
  description!: string;
  estimatedExtraRevenue?: number;
  confidence!: 'LOW' | 'MEDIUM' | 'HIGH';
  isAvailable!: boolean;
}

export class VendorAiOpportunityDto {
  title!: string;
  locationName!: string;
  timeWindow!: string;
  demandLevel!: 'LOW' | 'MEDIUM' | 'HIGH';
  actionLabel!: string;
}

export class VendorAiGuidanceResponseDto {
  access!: VendorInsightAccessDto;

  range!: 'today' | 'week' | 'month' | 'year';
  startDate!: Date;
  endDate!: Date;

  locked!: boolean;
  emptyState!: boolean;

  salesByLocation!: VendorAiSalesByLocationDto[];

  topSellingItems!: VendorAiTopSellingItemDto[];

  recommendedActions!: VendorAiRecommendedActionDto[];

  liveHotZones!: VendorAiLiveHotZoneDto[];

  todaysOpportunities!: VendorAiOpportunityDto[];

  dataAvailability!: {
    hasOrderData: boolean;
    hasLocationData: boolean;
    hasSearchDemandData: boolean;
    hasEventData: boolean;
  };

  lockedMessage?: string;
}
