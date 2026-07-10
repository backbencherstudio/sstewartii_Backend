// src/modules/vendor/application/vendor-insight-access.service.ts

import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import {
  VendorInsightAccessDto,
  VendorInsightPlan,
} from '../presentation/dto/vendor-insights.response.dto';

@Injectable()
export class VendorInsightAccessService {
  resolveAccess(vendor: {
    subscriptionStatus: SubscriptionStatus | null; // Made nullable
    subscriptionPlan: {
      name: string;
    } | null;
  }): VendorInsightAccessDto {
    const plan = this.resolvePlan(vendor);

    if (plan === 'TRIAL') {
      return {
        plan,
        canViewRevenue: true,
        canViewPeakHours: true,
        canViewOrderDistribution: false,
        canViewCustomerEngagement: false,
        canViewTopDishes: false,
        canViewTopCustomers: false,
        canViewTopSpots: false,
        canViewProfileViews: true,
        canViewRatings: true,
        canViewFavorites: true,
        canViewAiGuidance: false,
        canViewEvents: false,
        upgradeRequired: true,
        upgradePlan: 'PRO',
        lockedMessage:
          'Upgrade to see full performance insights about order distribution, customer engagement, top content, and more.',
      };
    }

    if (plan === 'STARTER') {
      return {
        plan,
        canViewRevenue: false,
        canViewPeakHours: false,
        canViewOrderDistribution: false,
        canViewCustomerEngagement: false,
        canViewTopDishes: false,
        canViewTopCustomers: false,
        canViewTopSpots: false,
        canViewProfileViews: true,
        canViewRatings: true,
        canViewFavorites: false,
        canViewAiGuidance: false,
        canViewEvents: false,
        upgradeRequired: true,
        upgradePlan: 'PRO',
        lockedMessage:
          'Upgrade to Pro to unlock analytics, performance dashboard, and customer engagement insights.',
      };
    }

    if (plan === 'PRO') {
      return {
        plan,
        canViewRevenue: true,
        canViewPeakHours: true,
        canViewOrderDistribution: true,
        canViewCustomerEngagement: true,
        canViewTopDishes: true,
        canViewTopCustomers: true,
        canViewTopSpots: true,
        canViewProfileViews: true,
        canViewRatings: true,
        canViewFavorites: true,
        canViewAiGuidance: false,
        canViewEvents: false,
        upgradeRequired: true,
        upgradePlan: 'ELITE',
        lockedMessage:
          'Upgrade to Elite to unlock AI guidance, event intelligence, hot zones, and advanced reporting.',
      };
    }

    if (plan === 'ELITE') {
      return {
        plan,
        canViewRevenue: true,
        canViewPeakHours: true,
        canViewOrderDistribution: true,
        canViewCustomerEngagement: true,
        canViewTopDishes: true,
        canViewTopCustomers: true,
        canViewTopSpots: true,
        canViewProfileViews: true,
        canViewRatings: true,
        canViewFavorites: true,
        canViewAiGuidance: true,
        canViewEvents: true,
        upgradeRequired: false,
      };
    }

    return {
      plan: 'FREE',
      canViewRevenue: false,
      canViewPeakHours: false,
      canViewOrderDistribution: false,
      canViewCustomerEngagement: false,
      canViewTopDishes: false,
      canViewTopCustomers: false,
      canViewTopSpots: false,
      canViewProfileViews: false,
      canViewRatings: false,
      canViewFavorites: false,
      canViewAiGuidance: false,
      canViewEvents: false,
      upgradeRequired: true,
      upgradePlan: 'PRO',
      lockedMessage:
        'Choose a plan to unlock vendor insights and performance analytics.',
    };
  }

  private resolvePlan(vendor: {
    subscriptionStatus: SubscriptionStatus | null; // Made nullable
    subscriptionPlan: {
      name: string;
    } | null;
  }): VendorInsightPlan {
    // If subscriptionStatus is null or not ACTIVE, treat as FREE
    if (
      !vendor.subscriptionStatus ||
      vendor.subscriptionStatus !== SubscriptionStatus.ACTIVE
    ) {
      return 'FREE';
    }

    const planName = vendor.subscriptionPlan?.name?.toUpperCase() ?? '';

    if (planName.includes('TRIAL')) return 'TRIAL';
    if (planName.includes('STARTER')) return 'STARTER';
    if (planName.includes('PRO')) return 'PRO';
    if (planName.includes('ELITE')) return 'ELITE';

    return 'FREE';
  }
}
