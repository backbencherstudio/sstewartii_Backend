import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VendorModule } from '../vendor/vendor/vendor.module';
import { CategoryController } from './presentation/controller/category.controller';
import { CategoryService } from './application/category.service';
import { CategoryRepository } from './infrastructure/repositories/category.repository';
import { ProductController } from './presentation/controller/product.controller';
import { CuisineRepository } from './infrastructure/repositories/cusine.repository';
import { ProductService } from './application/product.service';
import { StorageModule } from '@/common/storage/storage.module';
import { LocalStorageService } from '@/common/storage/local.storage.service';
import { ProductRepository } from './infrastructure/repositories/product.repository';
import { MediaModule } from '@/common/media/media.module';
import { ProductMapper } from './infrastructure/mappers/product.mapper';
import { CategoryMapper } from './infrastructure/mappers/category.mapper';

@Module({
  imports: [PrismaModule, VendorModule, StorageModule, MediaModule],
  controllers: [CategoryController, ProductController],
  providers: [
    CategoryService,
    ProductService,
    ProductMapper,
    CategoryMapper,
    {
      provide: 'ICategoryRepository',
      useClass: CategoryRepository,
    },
    {
      provide: 'IProductRepository',
      useClass: ProductRepository,
    },
    {
      provide: 'ICuisineRepository',
      useClass: CuisineRepository,
    },
    {
      provide: 'IStorageService',
      useClass: LocalStorageService,
    },
  ],
  exports: ['IProductRepository', ProductService],
})
export class ProductModule {}
