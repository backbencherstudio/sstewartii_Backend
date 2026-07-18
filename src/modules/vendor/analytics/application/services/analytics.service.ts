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
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AnalyticsService implements IAnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getVendorByUserId(userId: string): Promise<{ id: string } | null> {
    console.log('🔍 [REPO] Getting vendor by userId:', userId);

    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!vendor) {
      console.log('❌ [REPO] No vendor found for userId:', userId);
      return null;
    }

    console.log('✅ [REPO] Vendor found:', vendor.id);
    return vendor;
  }

  async getVendorAnalytics(
    vendorId: string,
    month?: string,
  ): Promise<VendorAnalytics> {
    const resolvedMonth = month ?? this.currentMonth();
    this.validateMonth(resolvedMonth);

    // Get subscription
    const subscription =
      await this.analyticsRepository.getVendorSubscriptionWithPlan(vendorId);

    console.log('📊 [SERVICE] Subscription found:', !!subscription);
    console.log(
      '📊 [SERVICE] Subscription plan code:',
      subscription?.subscriptionPlan?.code,
    );

    // Determine plan code
    const planCode = 'atliss_app_elite';

    // if (
    //   subscription &&
    //   subscription.isActive &&
    //   subscription.status === 'ACTIVE'
    // ) {
    //   if (subscription.subscriptionPlan?.code) {
    //     planCode = subscription.subscriptionPlan.code.toLowerCase();
    //   } else if (subscription.isTrialPeriod) {
    //     planCode = 'free_trial';
    //   }
    // } else if (subscription?.isTrialPeriod) {
    //   planCode = 'free_trial';
    // }

    console.log('🎯 [SERVICE] Final plan code:', planCode);

    const analyticsTier = AnalyticsTier.fromPlanCode(planCode);

    if (!analyticsTier.hasAnyDashboardAccess()) {
      return {
        vendorId,
        tier: analyticsTier.value,
        month: resolvedMonth,
        hasDashboardAccess: false,
        sections: [],
      };
    }

    const sections: AnalyticsSection[] = [];

    // Get the actual vendor ID for data fetching
    const vendor = await this.analyticsRepository.getVendorByUserId(vendorId);
    const actualVendorId = vendor?.id || vendorId;

    for (const capability of analyticsTier.visibleSections()) {
      if (analyticsTier.isUnlocked(capability)) {
        const data = await this.analyticsRepository.getSectionData(
          actualVendorId,
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
      vendorId: actualVendorId,
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
