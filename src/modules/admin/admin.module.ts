
import { Module } from '@nestjs/common';

import { AdminController } from './presentation/controllers/admin.controller';
import { AdminVendorVerificationService } from './application/admin.service';
import { AdminVendorVerificationRepository } from './infrastructure/repositories/admin.repository';
import { AdminMapper } from './infrastructure/mapper/admin.mapper';
import { PrismaService } from '@/prisma/prisma.service';
import { MediaService } from '@/common/media/media.service';
import { VendorModule } from '../vendor/vendor/vendor.module';
import { AdminCustomerService } from './application/admin.customer.service';
import { AdminCustomerRepository } from './infrastructure/repositories/admin.customer.repository';
import { AdminCustomerMapper } from './infrastructure/mapper/admin.customer.mapper';
import { CustomerModule } from '../customer/customer/customer.module';

@Module({
  controllers: [
    AdminController,
  ],
  imports: [
    VendorModule,
    CustomerModule,
  ],
  providers: [
    AdminVendorVerificationService,
    AdminMapper,
    PrismaService,
    MediaService,
    AdminCustomerService,
    AdminCustomerMapper,
    {
      provide: 'IAdminVendorVerificationRepository',
      useClass: AdminVendorVerificationRepository,
    },
     {
      provide: 'IAdminCustomerRepository',
      useClass: AdminCustomerRepository,
    },
  ],
  exports: [
    AdminVendorVerificationService,
  ],
})
export class AdminModule {}