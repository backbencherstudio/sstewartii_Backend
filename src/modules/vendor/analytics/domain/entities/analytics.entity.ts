import { AnalyticsCapability } from '../value-objects/analytics-tier.value-object';

export interface RevenueDataPoint {
  day: number;
  amount: number;
}

export interface RevenueData {
  total: number;
  currency: string;
  changePercent: number;
  series: RevenueDataPoint[];
}

export interface PeakHoursSlot {
  time: string; // "13:00"
  trafficLevel: 'high' | 'medium' | 'low';
  value: number;
}

export interface PeakHoursData {
  slots: PeakHoursSlot[];
}

export interface AiGuidanceSuggestion {
  title: string;
  message: string;
  reason: string;
}

export interface AiGuidanceData {
  suggestions: AiGuidanceSuggestion[];
  isDemoData: boolean; // true until a real AI provider is wired up
}

export interface OrderDistributionData {
  totalOrders: number;
  itemsSold: number;
  completedPercent: number;
  cancelledPercent: number;
}

export interface CustomerEngagementPoint {
  day: number;
  newCustomers: number;
  repeatedCustomers: number;
}

export interface CustomerEngagementData {
  series: CustomerEngagementPoint[];
  repeatRatePercent: number;
}

export interface TopDish {
  productId: string;
  name: string;
  orderCount: number;
  imageUrl?: string;
}

export interface TopContentData {
  topDishes: TopDish[];
  topCustomers: { customerId: string; name: string; orderCount: number }[];
  topSpots: { label: string; orderCount: number }[];
  spotlightDish?: TopDish;
}

export interface ProfileViewsData {
  total: number;
  changePercent: number;
  series: { day: number; views: number }[];
}

export interface AverageRatingData {
  average: number;
  totalReviews: number;
  breakdown: { star: number; percent: number }[];
}

export interface FavoritesData {
  totalFavorites: number;
  message: string;
}

export type AnalyticsSectionData =
  | RevenueData
  | PeakHoursData
  | AiGuidanceData
  | OrderDistributionData
  | CustomerEngagementData
  | TopContentData
  | ProfileViewsData
  | AverageRatingData
  | FavoritesData;

export interface UpsellCopy {
  badge?: string;
  title: string;
  body: string;
  ctaLabel: string;
  targetTier: string;
}

export interface AnalyticsSection {
  capability: AnalyticsCapability;
  locked: boolean;
  data?: AnalyticsSectionData;
  upsell?: UpsellCopy;
}

export interface VendorAnalytics {
  vendorId: string;
  tier: string;
  month: string; // "2026-01"
  hasDashboardAccess: boolean;
  sections: AnalyticsSection[];
}
