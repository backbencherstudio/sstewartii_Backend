import { Module } from '@nestjs/common';
import { VendorController } from './presentation/controllers/vendor.controller';
import { VendorService } from './application/vendor.service';
import { VendorRepository } from './infrastructure/repositories/vendor.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [VendorController],
  providers: [
    VendorService,
    PrismaService,
    {
      provide: 'IVendorRepository',
      useClass: VendorRepository,
    },
  ],
  exports: ['IVendorRepository'],
})
export class VendorModule {}