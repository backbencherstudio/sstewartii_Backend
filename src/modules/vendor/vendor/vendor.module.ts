import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VendorController } from './presentation/controllers/vendor.controller';
import { VendorService } from './application/vendor.service';
import { VendorRepository } from './infrastructure/repositories/vendor.repository';
import { MediaModule } from '@/common/media/media.module';
import { VendorMapper } from './infrastructure/mapper/vendor.mapper';
import { VendorInsightsMapper } from './infrastructure/mapper/vendor-insights.mapper';
import { VendorInsightAccessService } from './application/vendor-insight-access.service';
import { CustomerModule } from '@/modules/customer/customer/customer.module';

@Module({
  imports: [
    MediaModule,
  ],
  controllers: [VendorController],
  providers: [
    VendorService,
    PrismaService,
    VendorMapper,
    VendorInsightsMapper,
    VendorInsightAccessService,
    {
      provide: 'IVendorRepository',
      useClass: VendorRepository,
    },
  ],
  exports: ['IVendorRepository', VendorService],
})
export class VendorModule {}