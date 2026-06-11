import { AnalyticsSummaryResponseDto } from '../../presentation/dto/analytics-summary.response.dto';

export interface AnalyticsSummaryRawData {
  totalVendors:     number;
  totalCustomers:   number;
  totalSubscribers: number;
  platformRevenue:  number;
}

export class AdminAnalyticsMapper {

  static toSummaryResponse(
    raw: AnalyticsSummaryRawData,
  ): AnalyticsSummaryResponseDto {
    const dto              = new AnalyticsSummaryResponseDto();
    dto.totalVendors       = raw.totalVendors;
    dto.totalCustomers     = raw.totalCustomers;
    dto.totalSubscribers   = raw.totalSubscribers;
    dto.platformRevenue    = Number(raw.platformRevenue.toFixed(2));
    dto.updatedAt          = new Date();
    return dto;
  }
}