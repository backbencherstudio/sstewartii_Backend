import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsTimeFilter {
  YEAR = 'year',
  MONTH = 'month',
  WEEK = 'week',
}

export enum RevenueTimeFilter {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ANNUALLY = 'annually',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsTimeFilter,
    default: AnalyticsTimeFilter.YEAR,
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeFilter)
  platformFilter?: AnalyticsTimeFilter = AnalyticsTimeFilter.YEAR;

  @ApiPropertyOptional({
    enum: AnalyticsTimeFilter,
    default: AnalyticsTimeFilter.YEAR,
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeFilter)
  subscriberFilter?: AnalyticsTimeFilter = AnalyticsTimeFilter.YEAR;

  @ApiPropertyOptional({
    enum: RevenueTimeFilter,
    default: RevenueTimeFilter.ANNUALLY,
  })
  @IsOptional()
  @IsEnum(RevenueTimeFilter)
  revenueFilter?: RevenueTimeFilter = RevenueTimeFilter.ANNUALLY;
}
