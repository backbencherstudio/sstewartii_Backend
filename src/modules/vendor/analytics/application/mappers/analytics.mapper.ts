import { VendorAnalytics } from '../../domain/entities/analytics.entity';
import { AnalyticsResponseDto } from '../../presentation/dto/analytics.dto';

export class AnalyticsMapper {
  static toResponseDto(analytics: VendorAnalytics): AnalyticsResponseDto {
    return {
      tier: analytics.tier,
      month: analytics.month,
      hasDashboardAccess: analytics.hasDashboardAccess,
      sections: analytics.sections.map((s) => ({
        capability: s.capability,
        locked: s.locked,
        data: s.locked ? undefined : s.data,
        upsell: s.locked ? s.upsell : undefined,
      })),
    };
  }
}
