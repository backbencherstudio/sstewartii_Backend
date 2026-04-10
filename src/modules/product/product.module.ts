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

@Module({
  imports: [
    PrismaModule,
    VendorModule,
    StorageModule,
  ],
  controllers: [
    CategoryController,
    ProductController,
  ],
  providers: [
    CategoryService,
    ProductService,
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
    } 
  ],
})
export class ProductModule {}