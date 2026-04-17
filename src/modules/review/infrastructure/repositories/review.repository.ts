import { Injectable } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateReviewInput,
  IReviewRepository,
} from '../../domain/interface/review.repository.interface';

@Injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCustomerByUserId(userId: string): Promise<{
    id: string;
    isActive: boolean;
  } | null> {
    return this.prisma.customer.findUnique({
      where: { userId },
      select: {
        id: true,
        isActive: true,
      },
    });
  }

  async findCompletedOrderForReview(orderId: string): Promise<{
    id: string;
    customerId: string;
    vendorId: string;
    status: string;
  } | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        vendorId: true,
        status: true,
      },
    });

    if (!order) {
      return null;
    }

    return {
      ...order,
      status: order.status,
    };
  }

  async findExistingReviewByOrderId(orderId: string): Promise<{
    id: string;
  } | null> {
    return this.prisma.vendorReview.findUnique({
      where: { orderId },
      select: { id: true },
    });
  }

  async validateReviewTagIds(tagIds: string[]): Promise<string[]> {
    if (!tagIds.length) {
      return [];
    }

    const tags = await this.prisma.reviewTag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
      select: {
        id: true,
      },
    });

    return tags.map((tag) => tag.id);
  }

  async createReview(input: CreateReviewInput): Promise<any> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const review = await tx.vendorReview.create({
        data: {
          vendorId: input.vendorId,
          customerId: input.customerId,
          orderId: input.orderId,
          rating: input.rating,
          reviewText: input.reviewText,
        },
      });

      if (input.imageUrls?.length) {
        await tx.vendorReviewImage.createMany({
          data: input.imageUrls.map((imageUrl, index) => ({
            reviewId: review.id,
            imageUrl,
            position: index,
          })),
        });
      }

      if (input.tagIds?.length) {
        await tx.vendorReviewTagMap.createMany({
          data: input.tagIds.map((tagId) => ({
            reviewId: review.id,
            tagId,
          })),
        });
      }

      return tx.vendorReview.findUnique({
        where: { id: review.id },
        include: {
          images: {
            orderBy: { position: 'asc' },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    });
  }

  async getVendorReviewStats(vendorId: string): Promise<{
    average: number;
    count: number;
  }> {
    const result = await this.prisma.vendorReview.aggregate({
      where: { vendorId },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      average: result._avg.rating ?? 0,
      count: result._count.id ?? 0,
    };
  }

  async updateVendorReviewSummary(
    vendorId: string,
    average: number,
    count: number,
  ): Promise<void> {
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        reviewAverage: average,
        reviewCount: count,
      },
    });
  }
}