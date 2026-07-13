import { Inject, Injectable } from '@nestjs/common';
import type { IAnalyticsRepository } from '../../domain/interfaces/analytics.repository.interface';
import { ANALYTICS_REPOSITORY } from '../../domain/interfaces/analytics.repository.interface';
import type { IAnalyticsService } from '../../domain/interfaces/analytics.service.interface';
import {
  AnalyticsSection,
  UpsellCopy,
  VendorAnalytics,
} from '../../domain/entities/analytics.entity';
import {
  AnalyticsCapability,
  AnalyticsTier,
} from '../../domain/value-objects/analytics-tier.value-object';
import { InvalidMonthFormatException } from '../../domain/exceptions/analytics.exceptions';

@Injectable()
export class AnalyticsService implements IAnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: IAnalyticsRepository,
  ) {}

  async getVendorAnalytics(
    vendorId: string,
    month?: string,
  ): Promise<VendorAnalytics> {
    const resolvedMonth = month ?? this.currentMonth();
    this.validateMonth(resolvedMonth);

    const subscription =
      await this.analyticsRepository.getVendorSubscriptionWithPlan(vendorId);

      // console.log(subscription?.subscriptionPlan?.code);
      // console.log(subscription?.isActive);
      // console.log(subscription?.status);

    // Determine plan code from subscription data
    let planCode = 'free_user';

    if (
      subscription &&
      // subscription.isActive &&
      subscription.status === 'EXPIRED'
    ) {
      // Get plan code from the subscription plan
      if (subscription.subscriptionPlan?.code) {
        planCode = subscription.subscriptionPlan.code.toLowerCase();
        console.log(planCode);
      }
      // Check if it's a trial
      else if (subscription.isTrialPeriod) {
        planCode = 'free_trial';
      }
    } else if (subscription?.isTrialPeriod) {
      planCode = 'free_trial';
    }

    // console.log({ planCode });

    const analyticsTier = AnalyticsTier.fromPlanCode(planCode);

    if (!analyticsTier.hasAnyDashboardAccess()) {
      // free_user -> Flutter shows the "please upgrade" full-page state
      return {
        vendorId,
        tier: analyticsTier.value,
        month: resolvedMonth,
        hasDashboardAccess: false,
        sections: [],
      };
    }

    const sections: AnalyticsSection[] = [];

    for (const capability of analyticsTier.visibleSections()) {
      if (analyticsTier.isUnlocked(capability)) {
        const data = await this.analyticsRepository.getSectionData(
          vendorId,
          capability,
          resolvedMonth,
        );
        sections.push({ capability, locked: false, data });
      } else {
        sections.push({
          capability,
          locked: true,
          upsell: this.getUpsellCopy(capability, analyticsTier.value),
        });
      }
    }

    return {
      vendorId,
      tier: analyticsTier.value,
      month: resolvedMonth,
      hasDashboardAccess: true,
      sections,
    };
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private validateMonth(month: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new InvalidMonthFormatException(month);
    }
  }

  private getUpsellCopy(
    capability: AnalyticsCapability,
    tier: string,
  ): UpsellCopy {
    const copyMap: Partial<Record<AnalyticsCapability, UpsellCopy>> = {
      [AnalyticsCapability.AI_GUIDANCE]: {
        badge: undefined,
        title: 'Upgrade to Elite',
        body: 'Never miss out on an event! Unlock the AI suggestions, and many more!',
        ctaLabel: 'Upgrade to Elite',
        targetTier: 'elite_user',
      },
      [AnalyticsCapability.ORDER_DISTRIBUTION]: {
        badge: 'UPGRADE TO MORE',
        title: 'Ready to grow?',
        body: 'You are missing out on 40% more sales by using limited analytics. Upgrade to see full performance insights.',
        ctaLabel: 'Upgrade Now',
        targetTier: tier === 'starter_user' ? 'pro_user' : 'elite_user',
      },
      [AnalyticsCapability.CUSTOMER_ENGAGEMENT]: {
        badge: 'UPGRADE TO MORE',
        title: 'Ready to grow?',
        body: 'See who your repeat customers are and grow your loyal base. Upgrade to unlock full customer engagement insights.',
        ctaLabel: 'Upgrade Now',
        targetTier: tier === 'starter_user' ? 'pro_user' : 'elite_user',
      },
      [AnalyticsCapability.TOP_CONTENT]: {
        badge: 'UPGRADE TO MORE',
        title: 'Ready to grow?',
        body: 'Find out your top dishes, top customers and top spots. Upgrade to see full performance insights.',
        ctaLabel: 'Upgrade Now',
        targetTier: tier === 'starter_user' ? 'pro_user' : 'elite_user',
      },
      [AnalyticsCapability.REVENUE]: {
        badge: 'UPGRADE TO MORE',
        title: 'Ready to grow?',
        body: 'Upgrade to see full performance insights about Order Distribution, Customer Engagement, Top Content, and many more!',
        ctaLabel: 'Upgrade Now',
        targetTier: 'pro_user',
      },
      [AnalyticsCapability.PEAK_HOURS]: {
        badge: 'UPGRADE TO MORE',
        title: 'Ready to grow?',
        body: 'Upgrade to see full performance insights about Order Distribution, Customer Engagement, Top Content, and many more!',
        ctaLabel: 'Upgrade Now',
        targetTier: 'pro_user',
      },
    };

    return (
      copyMap[capability] ?? {
        title: 'Upgrade to unlock',
        body: 'Upgrade your plan to unlock this analytics section.',
        ctaLabel: 'Upgrade Now',
        targetTier: 'elite_user',
      }
    );
  }
}
