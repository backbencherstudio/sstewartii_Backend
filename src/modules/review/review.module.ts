import { Module } from '@nestjs/common';
import { ReviewController } from './presentation/controllers/review.controller';
import { ReviewService } from './application/review.service';
import { ReviewRepository } from './infrastructure/repositories/review.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [ReviewController],
  providers: [
    ReviewService,
    PrismaService,
    {
      provide: 'IReviewRepository',
      useClass: ReviewRepository,
    },
  ],
})
export class ReviewModule {}    