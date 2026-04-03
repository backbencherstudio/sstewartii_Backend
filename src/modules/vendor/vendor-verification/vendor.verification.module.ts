import { Module } from '@nestjs/common';
import { VendorVerificationService } from './application/vendor.verification.service';
import { VendorVerificationController } from './presentation/vendor.verify.controller';
import { VendorVerificationRepository } from './infrastructure/repositories/vendor.verification.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/common/storage/storage.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [
      StorageModule,
      PrismaModule,
      VendorModule,
    ],
  controllers: [VendorVerificationController],
  providers: [
    VendorVerificationService,
    {
      provide: 'IVendorVerificationRepository',
      useClass: VendorVerificationRepository,
    },
  ],
})
export class VendorVerificationModule {}