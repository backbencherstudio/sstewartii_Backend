import { IsOptional, IsIn } from 'class-validator';

export class VendorInsightsOverviewQueryDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year'])
  range?: 'today' | 'week' | 'month' | 'year' = 'month';
}

export class VendorAiGuidanceQueryDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year'])
  range?: 'today' | 'week' | 'month' | 'year' = 'month';
}
