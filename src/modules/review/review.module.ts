import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { VendorTruckReviewRepository } from './infrastructure/repositories/review.repository';

import { ReviewController } from './presentation/controllers/review.controller';
import { ReviewService } from './application/review.service';
import { CustomerModule } from '../customer/customer/customer.module';
import { VendorModule } from '../vendor/vendor/vendor.module';
import { MediaModule } from '@/common/media/media.module';
import { VendorTruckReviewMapper } from './infrastructure/mapper/review.mapper';

@Module({
  imports: [CustomerModule, VendorModule, MediaModule],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    PrismaService,
    VendorTruckReviewMapper,
    {
      provide: 'IVendorTruckReviewRepository',
      useClass: VendorTruckReviewRepository,
    },
  ],
})
export class ReviewModule {}
