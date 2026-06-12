import { AnalyticsPeriod } from "../../presentation/dto/analytics-summary.response.dto";

export interface DateRange {
  startDate: Date;
  endDate:   Date;
}

export function resolveDateRange(period: AnalyticsPeriod): DateRange {
  const now  = new Date();
  const year = now.getFullYear();

  switch (period) {
    case AnalyticsPeriod.THIS_YEAR:
      return {
        startDate: new Date(year, 0, 1),          // Jan 1 current year
        endDate:   now,
      };

    case AnalyticsPeriod.LAST_YEAR:
      return {
        startDate: new Date(year - 1, 0, 1),      // Jan 1 last year
        endDate:   new Date(year - 1, 11, 31, 23, 59, 59),
      };

    case AnalyticsPeriod.LAST_6_MONTHS:
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        endDate:   now,
      };

    case AnalyticsPeriod.LAST_30_DAYS:
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate:   now,
      };
  }
}