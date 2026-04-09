import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VendorModule } from '../vendor/vendor/vendor.module';
import { CategoryController } from './presentation/controller/category.controller';
import { CategoryService } from './application/category.service';
import { CategoryRepository } from './infrastructure/repositories/category.repository';
import { ProductController } from './presentation/controller/product.controller';
import { CuisineRepository } from './infrastructure/repositories/cusine.repository';
import { ProductService } from './application/product.service';

@Module({
  imports: [
    PrismaModule,
    VendorModule,
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
      provide: 'ICuisineRepository',
      useClass: CuisineRepository,
    }
  ],
})
export class ProductModule {}