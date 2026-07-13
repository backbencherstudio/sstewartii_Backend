import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsCapability } from '../../domain/value-objects/analytics-tier.value-object';

export class AnalyticsSectionDto {
  @ApiProperty({ enum: AnalyticsCapability })
  capability: AnalyticsCapability | undefined;

  @ApiProperty()
  locked: boolean | undefined;

  @ApiProperty({ required: false })
  data?: unknown;

  @ApiProperty({ required: false })
  upsell?: {
    badge?: string;
    title: string;
    body: string;
    ctaLabel: string;
    targetTier: string;
  };
}

export class AnalyticsResponseDto {
  @ApiProperty()
  tier: string | undefined;

  @ApiProperty()
  month: string | undefined;

  @ApiProperty()
  hasDashboardAccess: boolean | undefined;

  @ApiProperty({ type: [AnalyticsSectionDto] })
  sections: AnalyticsSectionDto[] | undefined;
}
