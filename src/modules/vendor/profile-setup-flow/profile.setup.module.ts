import { Module } from '@nestjs/common';
import { ProfileSetupFlowController } from './presentation/profile.setup.controller';
import { ProfileSetupFlowService } from './application/profile.setup.service';
import { ProfileSetupRepository } from './infrastructure/repositories/profile.setup.repository';
import { StorageModule } from 'src/common/storage/storage.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [
    StorageModule,
    PrismaModule,
    VendorModule,
  ],
  controllers: [
    ProfileSetupFlowController
  ],
  providers: [
    ProfileSetupFlowService,
    {
      provide: 'IProfileSetupRepository',
      useClass: ProfileSetupRepository,
    },
  ],
  
  exports: [ProfileSetupFlowService],
})
export class VendorProfileSetupModule {}