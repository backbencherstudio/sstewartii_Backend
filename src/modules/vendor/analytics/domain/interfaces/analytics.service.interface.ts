import type { VendorAnalytics } from '../entities/analytics.entity';

export const ANALYTICS_SERVICE = Symbol('ANALYTICS_SERVICE');

export interface IAnalyticsService {
  getVendorAnalytics(
    vendorId: string,
    month?: string,
  ): Promise<VendorAnalytics>;
}
