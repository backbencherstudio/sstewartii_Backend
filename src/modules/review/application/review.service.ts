import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OrderStatus } from '@prisma/client';

import type { IVendorTruckReviewRepository} from '../domain/interface/review.repository.interface';

import { VendorTruckReviewMapper } from '../infrastructure/mapper/review.mapper';

import { 
  CreateVendorTruckReviewDto,
  VendorTruckReviewsQueryDto,
  CreateFoodReviewDto,
 } from '../presentation/dto/review.dto';
import { 
  CreateVendorTruckReviewResponseDto,
  VendorTruckReviewTagListResponseDto,
  VendorTruckReviewsResponseDto,
  CreateFoodReviewResponseDto,
} from '../presentation/dto/review.response.dto';

import type { IStorageService } from '@/common/storage/storage.interface';
import { CustomerService } from '@/modules/customer/customer/application/customer.service';
import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';

@Injectable()
export class ReviewService {
  constructor(
    @Inject('IVendorTruckReviewRepository')
    private readonly reviewRepository: IVendorTruckReviewRepository,

    @Inject('IStorageService')
    private readonly storage: IStorageService,
    private readonly customerService: CustomerService,
    private readonly vendorService: VendorService,
    private readonly vendorTruckReviewMapper: VendorTruckReviewMapper,
  ) {}

  async getReviewTags(): Promise<VendorTruckReviewTagListResponseDto> {
    const tags = await this.reviewRepository.findAllTags();

    return this.vendorTruckReviewMapper.toTagListResponse(tags);
  }

   async createVendorTruckReview(
    userId: string,
    dto: CreateVendorTruckReviewDto,
    files?: Express.Multer.File[],
  ): Promise<CreateVendorTruckReviewResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const vendor = await this.vendorService.findByVendorId(dto.vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const existingReview = await this.reviewRepository.findExistingReview({
      vendorId: dto.vendorId,
      customerId: customer.id,
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this truck',
      );
    }

    const tagIds = dto.tagIds ?? [];

    if (tagIds.length) {
      const tags = await this.reviewRepository.validateTags(tagIds);

      if (tags.length !== tagIds.length) {
        throw new BadRequestException('One or more review tags are invalid');
      }
    }

    const imageUrls: string[] = [];

    if (files?.length) {
      const folder = `vendor/truck-reviews/${dto.vendorId}`;

      const uploadedUrls = await Promise.all(
        files.map((file) => this.storage.uploadFile(file, folder)),
      );

      imageUrls.push(...uploadedUrls);
    }

    const review = await this.reviewRepository.createReview({
      vendorId: dto.vendorId,
      customerId: customer.id,
      rating: dto.rating,
      reviewText: dto.reviewText,
      imageUrls,
      tagIds,
    });

    return this.vendorTruckReviewMapper.toCreateResponse(review);
  }

  async getVendorTruckReviews(
    vendorId: string,
    query: VendorTruckReviewsQueryDto,
  ): Promise<VendorTruckReviewsResponseDto> {
    const vendor = await this.reviewRepository.findVendorReviewSummary(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const [reviews, total] = await Promise.all([
      this.reviewRepository.findVendorTruckReviews(vendorId, query),
      this.reviewRepository.countVendorTruckReviews(vendorId),
    ]);

    return this.vendorTruckReviewMapper.toTruckReviewListResponse({
      vendorId: vendor.id,
      reviewAverage: vendor.truckReviewAverage,
      reviewCount: vendor.truckReviewCount,
      reviews,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      total,
    });
  }

  async createFoodReview(
    userId: string,
    dto: CreateFoodReviewDto,
    files?: Express.Multer.File[],
  ): Promise<CreateFoodReviewResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const orderItem = await this.reviewRepository.findOrderItemForReview(
      dto.orderItemId,
    );

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.order.customerId !== customer.id) {
      throw new ForbiddenException('You cannot review this food item');
    }

    if (orderItem.order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review food from completed orders',
      );
    }

    const existingReview =
      await this.reviewRepository.findExistingReviewByOrderItem(
        dto.orderItemId,
      );

    if (existingReview) {
      throw new BadRequestException(
        'This food item has already been reviewed',
      );
    }

    const tagIds = dto.tagIds ?? [];

    if (tagIds.length) {
      const tags = await this.reviewRepository.validatefoodReviewTags(tagIds);

      if (tags.length !== tagIds.length) {
        throw new BadRequestException('One or more food review tags are invalid');
      }
    }

    const imageUrls: string[] = [];

    if (files?.length) {
      const folder = `food/reviews/${orderItem.productId}`;

      const uploadedUrls = await Promise.all(
        files.map((file) => this.storage.uploadFile(file, folder)),
      );

      imageUrls.push(...uploadedUrls);
    }

    const review = await this.reviewRepository.createReview({
      productId: orderItem.productId,
      customerId: customer.id,
      orderItemId: orderItem.id,
      rating: dto.rating,
      reviewText: dto.reviewText,
      imageUrls,
      tagIds,
    });

    return FoodReviewMapper.toCreateResponse(review);
  }
}