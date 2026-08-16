import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VendorController } from './presentation/controllers/vendor.controller';
import { VendorService } from './application/vendor.service';
import { VendorRepository } from './infrastructure/repositories/vendor.repository';
import { MediaModule } from '@/common/media/media.module';
import { VendorMapper } from './infrastructure/mapper/vendor.mapper';
import { VendorInsightsMapper } from './infrastructure/mapper/vendor-insights.mapper';
import { VendorInsightAccessService } from './application/vendor-insight-access.service';
import { VendorCategoryModule } from '../category/category.module';
import { UserRepository } from '@/modules/auth/infrastructure/repositories/user.repository';
import { CustomerRepository } from '@/modules/customer/customer/infrastructure/repositories/customer.repository';

@Module({
  imports: [MediaModule, VendorCategoryModule],
  controllers: [VendorController],
  providers: [
    VendorService,
    PrismaService,
    VendorMapper,
    VendorInsightsMapper,
    VendorInsightAccessService,
    CustomerRepository,
    UserRepository,
    {
      provide: 'IVendorRepository',
      useClass: VendorRepository,
    },
  ],
  exports: ['IVendorRepository', VendorService, UserRepository],
})
export class VendorModule {}
