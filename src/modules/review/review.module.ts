import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { VendorTruckReviewRepository } from './infrastructure/repositories/review.repository';

import { ReviewController } from './presentation/controllers/review.controller';
import { ReviewService } from './application/review.service';
import { CustomerModule } from '../customer/customer/customer.module';
import { VendorModule } from '../vendor/vendor/vendor.module';

@Module({
  imports:[
    CustomerModule,
    VendorModule,
  ],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    PrismaService,
    {
      provide: 'IVendorTruckReviewRepository',
      useClass: VendorTruckReviewRepository,
    },
  ],
})
export class ReviewModule {}    