import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import type { IStorageService } from '@/common/storage/storage.interface';
import type {
  IReviewRepository,
} from '../domain/interface/review.repository.interface';
import { CreateReviewDto } from '../presentation/dto/review.dto';
import { CreateReviewResponseDto } from '../presentation/dto/review.response.dto';
import { ReviewMapper } from '../infrastructure/mapper/review.mapper';

@Injectable()
export class ReviewService {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,

    @Inject('IStorageService')
    private readonly storage: IStorageService,
  ) {}

  async createReview(
    userId: string,
    dto: CreateReviewDto,
    files?: Express.Multer.File[],
  ): Promise<CreateReviewResponseDto> {
    const customer = await this.reviewRepository.findCustomerByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Active customer not found');
    }

    const order = await this.reviewRepository.findCompletedOrderForReview(
      dto.orderId,
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customer.id) {
      throw new ForbiddenException('You cannot review this order');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review completed orders',
      );
    }

    const existingReview =
      await this.reviewRepository.findExistingReviewByOrderId(dto.orderId);

    if (existingReview) {
      throw new BadRequestException('Review already submitted for this order');
    }

    let validTagIds: string[] = [];

    if (dto.tagIds?.length) {
      validTagIds = await this.reviewRepository.validateReviewTagIds(dto.tagIds);

      if (validTagIds.length !== dto.tagIds.length) {
        throw new BadRequestException('One or more review tags are invalid');
      }
    }

    let imageUrls: string[] = [];

    if (files?.length) {
      const folder = `review/${order.vendorId}/${dto.orderId}`;

      imageUrls = await Promise.all(
        files.map((file) => this.storage.uploadFile(file, folder)),
      );
    }

    const review = await this.reviewRepository.createReview({
      vendorId: order.vendorId,
      customerId: customer.id,
      orderId: order.id,
      rating: dto.rating,
      reviewText: dto.reviewText,
      imageUrls,
      tagIds: validTagIds,
    });

    const stats = await this.reviewRepository.getVendorReviewStats(order.vendorId);

    await this.reviewRepository.updateVendorReviewSummary(
      order.vendorId,
      stats.average,
      stats.count,
    );

    return ReviewMapper.toCreateResponse(review);
  }
}