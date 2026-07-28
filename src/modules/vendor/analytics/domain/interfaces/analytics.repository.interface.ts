// domain/interfaces/analytics.repository.interface.ts
import type { AnalyticsCapability } from '../value-objects/analytics-tier.value-object';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

export interface VendorSubscriptionWithPlan {
  id: string;
  status: string;
  isActive: boolean;
  isTrialPeriod: boolean;
  autoRenew: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  expiresAt: Date | null;
  lastRenewalDate: Date | null;
  cancellationDate: Date | null;
  revenueCatAppUserId: string | null;
  entitlementId: string | null;
  productId: string | null;
  store: string | null;
  provider: string | null;
  subscriptionPlan: {
    id: string;
    name: string;
    code: string;
    durationDays: number;
    maxProducts: number;
    price: number;
    currency: string;
    revenueCatEntitlementId: string | null;
  } | null;
}

export interface IAnalyticsRepository {
  getVendorByUserId(userId: string): Promise<{ id: string } | null>;
  getVendorSubscriptionWithPlan(
    userId: string,
  ): Promise<VendorSubscriptionWithPlan | null>;
  getSectionData(
    vendorId: string,
    capability: AnalyticsCapability,
    month: string,
  ): Promise<any>;
}
