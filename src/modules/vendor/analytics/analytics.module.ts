import { Module } from '@nestjs/common';
import { AnalyticsController } from './presentation/controllers/analytics.controller';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsRepository } from './infrastructure/repositories/analytics.repository';
import { ANALYTICS_SERVICE } from './domain/interfaces/analytics.service.interface';
import { ANALYTICS_REPOSITORY } from './domain/interfaces/analytics.repository.interface';

@Module({
  controllers: [AnalyticsController],
  providers: [
    { provide: ANALYTICS_SERVICE, useClass: AnalyticsService },
    { provide: ANALYTICS_REPOSITORY, useClass: AnalyticsRepository },
  ],
  exports: [ANALYTICS_SERVICE],
})
export class AnalyticsModule {}
