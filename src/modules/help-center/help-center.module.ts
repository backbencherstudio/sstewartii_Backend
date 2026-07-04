import { PrismaService } from '@/prisma/prisma.service';
import { Module } from '@nestjs/common';
import { HelpCenterController } from './presentation/controllers/help-center.controller';
import { HelpCenterService } from './application/help-center.service';
import { HelpCenterRepository } from './infrastructure/repositories/help-center.repository';
import { HelpCenterMapper } from './infrastructure/mapper/help-center.mapper';
import { CustomerModule } from '@/modules/customer/customer/customer.module';
import { VendorModule } from '../vendor/vendor/vendor.module';

@Module({
  imports: [CustomerModule, VendorModule],
  controllers: [HelpCenterController],
  providers: [
    HelpCenterService,
    HelpCenterMapper,
    PrismaService,
    {
      provide: 'IHelpCenterRepository',
      useClass: HelpCenterRepository,
    },
  ],
  exports: [HelpCenterService],
})
export class HelpCenterModule {}
