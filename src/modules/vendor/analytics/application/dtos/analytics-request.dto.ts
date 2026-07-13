import { IsOptional, Matches } from 'class-validator';

export class AnalyticsRequestDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format, e.g. 2026-01',
  })
  month?: string;
}
