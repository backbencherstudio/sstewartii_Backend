import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RevenueCatWebhookController } from './revenuecat.controller';
import { RevenueCatService } from './revenuecat.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [RevenueCatWebhookController],
  providers: [RevenueCatService],
  exports: [RevenueCatService],
})
export class RevenueCatModule {}
