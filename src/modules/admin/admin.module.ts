
import { Module } from '@nestjs/common';

import { AdminController } from './presentation/controllers/admin.controller';
import { AdminVendorVerificationService } from './application/admin.service';
import { AdminVendorVerificationRepository } from './infrastructure/repositories/admin.repository';
import { AdminMapper } from './infrastructure/mapper/admin.mapper';
import { PrismaService } from '@/prisma/prisma.service';
import { MediaService } from '@/common/media/media.service';

@Module({
  controllers: [
    AdminController,
  ],
  providers: [
    AdminVendorVerificationService,
    AdminMapper,
    PrismaService,
    MediaService,
    {
      provide: 'IAdminVendorVerificationRepository',
      useClass: AdminVendorVerificationRepository,
    },
  ],
  exports: [
    AdminVendorVerificationService,
  ],
})
export class AdminModule {}