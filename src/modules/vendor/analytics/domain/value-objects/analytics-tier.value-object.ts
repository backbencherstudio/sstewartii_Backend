export enum SubscriptionTier {
  FREE_USER = 'free_user',
  FREE_TRIAL_USER = 'free_trial_user',
  STARTER_USER = 'atliss_app_starter',
  PRO_USER = 'atliss_app_pro',
  ELITE_USER = 'atliss_app_elite',
}

export enum AnalyticsCapability {
  REVENUE = 'revenue',
  PEAK_HOURS = 'peak_hours',
  AI_GUIDANCE = 'ai_guidance',
  ORDER_DISTRIBUTION = 'order_distribution',
  CUSTOMER_ENGAGEMENT = 'customer_engagement',
  TOP_CONTENT = 'top_content',
  PROFILE_VIEWS = 'profile_views',
  AVERAGE_RATING = 'average_rating',
  FAVORITES = 'favorites',
}

/**
 * Which capabilities exist on a tier's dashboard AT ALL.
 * starter_user only ever sees the 3 "basic" widgets — the rest
 * aren't rendered as locked cards, they're just not in the response.
 */
const TIER_VISIBLE_SECTIONS: Record<SubscriptionTier, AnalyticsCapability[]> = {
  [SubscriptionTier.FREE_USER]: [],
  [SubscriptionTier.FREE_TRIAL_USER]: [
    AnalyticsCapability.REVENUE,
    AnalyticsCapability.PEAK_HOURS,
    AnalyticsCapability.AI_GUIDANCE,
    AnalyticsCapability.PROFILE_VIEWS,
    AnalyticsCapability.AVERAGE_RATING,
    AnalyticsCapability.FAVORITES,
  ],
  [SubscriptionTier.STARTER_USER]: [
    AnalyticsCapability.PROFILE_VIEWS,
    AnalyticsCapability.AVERAGE_RATING,
    AnalyticsCapability.FAVORITES,
  ],
  [SubscriptionTier.PRO_USER]: [
    AnalyticsCapability.REVENUE,
    AnalyticsCapability.PEAK_HOURS,
    AnalyticsCapability.AI_GUIDANCE,
    AnalyticsCapability.ORDER_DISTRIBUTION,
    AnalyticsCapability.CUSTOMER_ENGAGEMENT,
    AnalyticsCapability.TOP_CONTENT,
    AnalyticsCapability.PROFILE_VIEWS,
    AnalyticsCapability.AVERAGE_RATING,
    AnalyticsCapability.FAVORITES,
  ],
  [SubscriptionTier.ELITE_USER]: Object.values(AnalyticsCapability),
};

/**
 * Of the visible sections, which ones actually get real data
 * vs. rendered locked with an upsell.
 */
const TIER_UNLOCKED: Record<SubscriptionTier, Set<AnalyticsCapability>> = {
  [SubscriptionTier.FREE_USER]: new Set(),
  [SubscriptionTier.FREE_TRIAL_USER]: new Set([
    AnalyticsCapability.REVENUE,
    AnalyticsCapability.PEAK_HOURS,
    AnalyticsCapability.PROFILE_VIEWS,
    AnalyticsCapability.AVERAGE_RATING,
    AnalyticsCapability.FAVORITES,
    // AI_GUIDANCE deliberately absent -> locked
  ]),
  [SubscriptionTier.STARTER_USER]: new Set([
    AnalyticsCapability.PROFILE_VIEWS,
    AnalyticsCapability.AVERAGE_RATING,
    AnalyticsCapability.FAVORITES,
  ]),
  [SubscriptionTier.PRO_USER]: new Set([
    AnalyticsCapability.REVENUE,
    AnalyticsCapability.PEAK_HOURS,
    AnalyticsCapability.ORDER_DISTRIBUTION,
    AnalyticsCapability.CUSTOMER_ENGAGEMENT,
    AnalyticsCapability.TOP_CONTENT,
    AnalyticsCapability.PROFILE_VIEWS,
    AnalyticsCapability.AVERAGE_RATING,
    AnalyticsCapability.FAVORITES,
    // AI_GUIDANCE deliberately absent -> locked, upsell to Elite
  ]),
  [SubscriptionTier.ELITE_USER]: new Set(Object.values(AnalyticsCapability)),
};

export class AnalyticsTier {
  constructor(private readonly tier: SubscriptionTier) {}

  get value(): SubscriptionTier {
    return this.tier;
  }

  visibleSections(): AnalyticsCapability[] {
    return TIER_VISIBLE_SECTIONS[this.tier];
  }

  isUnlocked(capability: AnalyticsCapability): boolean {
    return TIER_UNLOCKED[this.tier].has(capability);
  }

  hasAnyDashboardAccess(): boolean {
    return this.visibleSections().length > 0;
  }

  static fromPlanCode(code: string | null | undefined): AnalyticsTier {
    const validTiers = Object.values(SubscriptionTier) as string[];
    if (code && validTiers.includes(code)) {
      return new AnalyticsTier(code as SubscriptionTier);
    }
    // no active/recognized plan -> treat as free_user
    return new AnalyticsTier(SubscriptionTier.FREE_USER);
  }
}
