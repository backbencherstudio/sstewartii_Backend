import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { VendorCategoryController } from './presentation/controllers/vendor-category.controller';
import { VendorCategoryService } from './application/vendor-category.service';
import { VendorCategoryRepository } from './infrastructure/repositories/vendor-category.repository';
import { VendorCategoryMapper } from './infrastructure/mappers/vendor-category.mapper';

@Module({
  imports: [PrismaModule],
  controllers: [VendorCategoryController],
  providers: [
    VendorCategoryService,
    {
      provide: 'IVendorCategoryRepository',
      useClass: VendorCategoryRepository,
    },
    VendorCategoryRepository,
    VendorCategoryMapper,
  ],
  exports: [VendorCategoryService],
})
export class VendorCategoryModule {}
