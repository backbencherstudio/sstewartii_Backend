import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VendorController } from './presentation/controllers/vendor.controller';
import { VendorService } from './application/vendor.service';
import { VendorRepository } from './infrastructure/repositories/vendor.repository';
import { MediaModule } from '@/common/media/media.module';
import { VendorMapper } from './infrastructure/mapper/vendor.mapper';

@Module({
  imports: [
    MediaModule,
  ],
  controllers: [VendorController],
  providers: [
    VendorService,
    PrismaService,
    VendorMapper,
    {
      provide: 'IVendorRepository',
      useClass: VendorRepository,
    },
  ],
  exports: ['IVendorRepository', VendorService],
})
export class VendorModule {}