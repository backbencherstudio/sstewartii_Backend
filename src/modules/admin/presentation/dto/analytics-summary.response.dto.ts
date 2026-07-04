import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsSummaryResponseDto {
  totalVendors!: number;
  totalCustomers!: number;
  totalSubscribers!: number;
  platformRevenue!: number;
  updatedAt!: Date;
}

export enum AnalyticsPeriod {
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  LAST_6_MONTHS = 'last_6_months',
  LAST_30_DAYS = 'last_30_days',
}

export class PlatformGrowthQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.THIS_YEAR,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.THIS_YEAR;
}
