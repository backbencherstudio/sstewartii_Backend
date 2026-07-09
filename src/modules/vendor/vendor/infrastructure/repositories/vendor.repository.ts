/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  OrderStatus,
  VendorLiveStatus,
  VerificationStatus,
  KycStatus,
} from '@prisma/client';

import {
  IVendorRepository,
  VendorInsightsDateRangeInput,
  VendorInsightProfileView,
  VendorFavoriteCountView,
  VendorInsightOrderView,
  VendorAiProfileView,
  VendorAiDateRangeInput,
  VendorAiOrderView,
  VendorReviewSummaryResult,
  VendorReviewResult,
  VendorFollowersProfileView,
} from '../../domain/interface/vendor.repository.interface';
import { Vendor } from '../../domain/entities/vendor.entity';

import { VendorMapper } from '../mapper/vendor.mapper';

import {
  VendorMenuQueryDto,
  VendorMenuItemsQueryDto,
  VendorReviewsQueryDtoMe,
} from '../../presentation/dto/vendor.dto';

@Injectable()
export class VendorRepository implements IVendorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVendorId(vendorId: string): Promise<Vendor | null> {
    const vendorRecord = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    return vendorRecord ? VendorMapper.toDomain(vendorRecord) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Vendor | null> {
    if (!ownerId) {
      throw new BadRequestException('Owner ID is required');
    }

    const vendorRecord = await this.prisma.vendor.findUnique({
      where: {
        ownerId: ownerId,
      },
    });

    return vendorRecord ? VendorMapper.toDomain(vendorRecord) : null;
  }

  async findById(id: string): Promise<Vendor | null> {
    const vendorRecord = await this.prisma.vendor.findUnique({
      where: { id },
    });

    return vendorRecord ? VendorMapper.toDomain(vendorRecord) : null;
  }

  private mapToDomain(vendorRecord: any): Vendor {
    return VendorMapper.toDomain(vendorRecord);
  }

  async findVendorMenuById(
    vendorId: string,
    query: VendorMenuQueryDto,
  ): Promise<any | null> {
    const search = query.search?.trim();
    const category = query.category?.trim();

    const productWhere: Prisma.ProductWhereInput = {
      vendorId,
      isActive: true,
    };

    const andConditions: Prisma.ProductWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      });
    }

    if (category) {
      andConditions.push({
        category: {
          name: {
            equals: category,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      });
    }

    if (andConditions.length > 0) {
      productWhere.AND = andConditions;
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        serviceArea: true,
        operationHours: true,
        cuisines: {
          include: {
            cuisine: true,
          },
        },
        products: {
          where: productWhere,
          include: {
            category: true,
            images: {
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
          orderBy: [
            {
              category: {
                name: 'asc',
              },
            },
            {
              createdAt: 'desc',
            },
          ],
        },
      },
    });

    return vendor;
  }

  async findVendorInfoById(vendorId: string): Promise<any | null> {
    return this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        serviceArea: true,
        operationHours: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { priority: 'asc' },
            { activeFrom: 'desc' },
          ],
        },
        socialLinks: true,
      },
    });
  }

  async resetTruckGalleryPrimary(vendorId: string): Promise<void> {
    await this.prisma.truckGalleryImage.updateMany({
      where: { vendorId },
      data: { isPrimary: false },
    });
  }

  async createTruckGalleryImages(data: {
    vendorId: string;
    images: {
      url: string;
      caption?: string;
      isPrimary?: boolean;
      position?: number;
    }[];
  }): Promise<void> {
    await this.prisma.truckGalleryImage.createMany({
      data: data.images.map((image, index) => ({
        vendorId: data.vendorId,
        url: image.url,
        caption: image.caption,
        isPrimary: image.isPrimary ?? false,
        position: image.position ?? index,
      })),
    });
  }

  async findTruckGalleryByOwnerId(ownerId: string): Promise<{
    id: string;
    truckGalleryImages: {
      id: string;
      url: string;
      caption: string | null;
      isPrimary: boolean;
      position: number;
      createdAt: Date;
    }[];
  } | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        truckGalleryImages: {
          orderBy: [
            { isPrimary: 'desc' },
            { position: 'asc' },
            { createdAt: 'asc' },
          ],
          select: {
            id: true,
            url: true,
            caption: true,
            isPrimary: true,
            position: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findTruckGalleryImageById(imageId: string): Promise<{
    id: string;
    vendorId: string;
    url: string;
    caption: string | null;
    isPrimary: boolean;
    position: number;
    createdAt: Date;
  } | null> {
    return this.prisma.truckGalleryImage.findUnique({
      where: { id: imageId },
      select: {
        id: true,
        vendorId: true,
        url: true,
        caption: true,
        isPrimary: true,
        position: true,
        createdAt: true,
      },
    });
  }

  async deleteTruckGalleryImages(
    imageIds: string[],
  ): Promise<{ count: number }> {
    const result = await this.prisma.truckGalleryImage.deleteMany({
      where: {
        id: { in: imageIds },
      },
    });

    return { count: result.count };
  }

  async updateTruckGalleryImage(data: {
    id: string;
    caption?: string | null;
    isPrimary?: boolean;
    position?: number;
  }): Promise<{
    id: string;
    url: string;
    caption: string | null;
    isPrimary: boolean;
    position: number;
    createdAt: Date;
  }> {
    const { id, ...updateData } = data;

    return this.prisma.truckGalleryImage.update({
      where: { id },
      data: {
        caption: updateData.caption ?? undefined,
        isPrimary: updateData.isPrimary ?? undefined,
        position: updateData.position ?? undefined,
      },
      select: {
        id: true,
        url: true,
        caption: true,
        isPrimary: true,
        position: true,
        createdAt: true,
      },
    });
  }

  async findVendorHomeByOwnerId(ownerId: string): Promise<any | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      include: {
        serviceArea: true,
        vendorVerification: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async getVendorTodayStats(data: {
    vendorId: string;
    startOfDay: Date;
    endOfDay: Date;
  }): Promise<{
    todaySale: number;
    ordersCompleted: number;
    pendingOrders: number;
    cancelledOrders: number;
  }> {
    const [
      completedAggregate,
      ordersCompleted,
      pendingOrders,
      cancelledOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          vendorId: data.vendorId,
          status: OrderStatus.COMPLETED,
          completedAt: {
            gte: data.startOfDay,
            lte: data.endOfDay,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      this.prisma.order.count({
        where: {
          vendorId: data.vendorId,
          status: OrderStatus.COMPLETED,
          completedAt: {
            gte: data.startOfDay,
            lte: data.endOfDay,
          },
        },
      }),

      this.prisma.order.count({
        where: {
          vendorId: data.vendorId,
          status: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
              OrderStatus.READY_FOR_PICKUP,
            ],
          },
        },
      }),

      this.prisma.order.count({
        where: {
          vendorId: data.vendorId,
          status: OrderStatus.CANCELLED,
          cancelledAt: {
            gte: data.startOfDay,
            lte: data.endOfDay,
          },
        },
      }),
    ]);

    return {
      todaySale: completedAggregate._sum.totalAmount ?? 0,
      ordersCompleted,
      pendingOrders,
      cancelledOrders,
    };
  }

  async findVendorStatusByOwnerId(ownerId: string): Promise<{
    id: string;
    status: VendorLiveStatus;
    statusUpdatedAt: Date | null;
  } | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        status: true,
        statusUpdatedAt: true,
      },
    });
  }

  async findGoLiveEligibilityByOwnerId(ownerId: string): Promise<{
    id: string;
    kycStatus: KycStatus;
    vendorVerification: {
      id: string;
      status: VerificationStatus;
    } | null;
  } | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        kycStatus: true,
        subscriptionStatus: true,
        vendorVerification: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  async updateVendorStatus(data: {
    ownerId: string;
    status: VendorLiveStatus;
  }): Promise<{
    id: string;
    status: VendorLiveStatus;
    statusUpdatedAt: Date | null;
  }> {
    return this.prisma.vendor.update({
      where: {
        ownerId: data.ownerId,
      },
      data: {
        status: data.status,
        statusUpdatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        statusUpdatedAt: true,
      },
    });
  }

  async findVendorMenuCategories(ownerId: string): Promise<any | null> {
    const vendor = await this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        businessName: true,
      },
    });

    if (!vendor) {
      return null;
    }

    const products = await this.prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        estimateCookTime: true,
        isActive: true,

        category: {
          select: {
            id: true,
            name: true,
          },
        },

        cuisine: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },

        images: {
          orderBy: [
            {
              isPrimary: 'desc',
            },
            {
              position: 'asc',
            },
          ],
          select: {
            id: true,
            url: true,
            isPrimary: true,
            position: true,
          },
        },
      },
    });

    return {
      id: vendor.id,
      businessName: vendor.businessName,
      products,
    };
  }

  async findVendorMenuItems(
    ownerId: string,
    query: VendorMenuItemsQueryDto,
  ): Promise<{
    total: number;
    items: any[];
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      vendor: {
        ownerId,
      },
    };

    const andConditions: Prisma.ProductWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            category: {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        ],
      });
    }

    if (query.categoryId) {
      andConditions.push({
        categoryId: query.categoryId,
      });
    }

    if (typeof query.isActive === 'boolean') {
      andConditions.push({
        isActive: query.isActive,
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({
        where,
      }),

      this.prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          estimateCookTime: true,
          isActive: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            orderBy: {
              position: 'asc',
            },
            take: 1,
            select: {
              id: true,
              url: true,
              position: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      items,
    };
  }

  async findVendorIdByOwnerId(ownerId: string): Promise<{ id: string } | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
      },
    });
  }

  async findVendorMenuItemOwner(productId: string): Promise<{
    id: string;
    vendorId: string;
    name: string;
    isActive: boolean;
    isDeleted: boolean;
  } | null> {
    return this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        vendorId: true,
        name: true,
        isActive: true,
        isDeleted: true,
      },
    });
  }

  async updateVendorMenuItemStatus(data: {
    productId: string;
    isActive: boolean;
  }): Promise<{
    id: string;
    name: string;
    isActive: boolean;
  }> {
    return this.prisma.product.update({
      where: {
        id: data.productId,
      },
      data: {
        isActive: data.isActive,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }

  async softDeleteVendorMenuItem(productId: string): Promise<{
    id: string;
    isDeleted: boolean;
    deletedAt: Date | null;
  }> {
    return this.prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        isDeleted: true,
        deletedAt: true,
      },
    });
  }

  async findVendorInsightProfileByOwnerId(
    ownerId: string,
  ): Promise<VendorInsightProfileView | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        truckReviewAverage: true,
        truckReviewCount: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        subscriptionPlan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOrdersForInsights(
    data: VendorInsightsDateRangeInput,
  ): Promise<VendorInsightOrderView[]> {
    return this.prisma.order.findMany({
      where: {
        vendorId: data.vendorId,
        createdAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
          ],
        },
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        completedAt: true,
        cancelledAt: true,
        customer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            lineTotal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async countVendorFavorites(
    vendorId: string,
  ): Promise<VendorFavoriteCountView> {
    const total = await this.prisma.favoriteVendor.count({
      where: {
        vendorId,
      },
    });

    return { total };
  }

  async countVendorFavoritesInRange(
    data: VendorInsightsDateRangeInput,
  ): Promise<VendorFavoriteCountView> {
    const total = await this.prisma.favoriteVendor.count({
      where: {
        vendorId: data.vendorId,
        createdAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
      },
    });

    return { total };
  }

  async findAiProfileByOwnerId(
    ownerId: string,
  ): Promise<VendorAiProfileView | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        businessName: true,
        subscriptionStatus: true,
        subscriptionPlan: {
          select: {
            id: true,
            name: true,
          },
        },
        serviceArea: {
          select: {
            id: true,
            address: true,
            latitude: true,
            longitude: true,
            radius: true,
          },
        },
      },
    });
  }

  async findOrdersForAiGuidance(
    data: VendorAiDateRangeInput,
  ): Promise<VendorAiOrderView[]> {
    return this.prisma.order.findMany({
      where: {
        vendorId: data.vendorId,
        createdAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
        status: {
          in: [
            OrderStatus.COMPLETED,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
          ],
        },
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        orderItems: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            lineTotal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getVendorReviewSummary(
    vendorId: string,
  ): Promise<VendorReviewSummaryResult> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        truckReviewAverage: true,
        truckReviewCount: true,
      },
    });

    const groupedRatings = await this.prisma.vendorTruckReview.groupBy({
      by: ['rating'],
      where: { vendorId },
      _count: {
        rating: true,
      },
    });

    return {
      averageRating: vendor?.truckReviewAverage ?? 0,
      totalReviews: vendor?.truckReviewCount ?? 0,
      ratingCounts: groupedRatings.map((item) => ({
        rating: item.rating,
        count: item._count.rating,
      })),
    };
  }

  async findVendorReviews(
    vendorId: string,
    query: VendorReviewsQueryDtoMe,
  ): Promise<VendorReviewResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const orderBy = this.buildReviewOrderBy(query.sort);

    const where: Prisma.VendorTruckReviewWhereInput = {
      vendorId,
    };

    const [total, reviews] = await Promise.all([
      this.prisma.vendorTruckReview.count({
        where,
      }),

      this.prisma.vendorTruckReview.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          customer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          images: {
            orderBy: {
              position: 'asc',
            },
            select: {
              id: true,
              imageUrl: true,
              position: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      reviews,
    };
  }

  private buildReviewOrderBy(
    sort?: 'MOST_RECENT' | 'HIGHEST_RATED' | 'LOWEST_RATED',
  ): Prisma.VendorTruckReviewOrderByWithRelationInput[] {
    if (sort === 'HIGHEST_RATED') {
      return [{ rating: 'desc' }, { createdAt: 'desc' }];
    }

    if (sort === 'LOWEST_RATED') {
      return [{ rating: 'asc' }, { createdAt: 'desc' }];
    }

    return [{ createdAt: 'desc' }];
  }

  async findFollowersProfileByOwnerId(
    ownerId: string,
  ): Promise<VendorFollowersProfileView | null> {
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        subscriptionStatus: true,
        subscriptionPlan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async countVendorFollowers(vendorId: string): Promise<number> {
    return this.prisma.favoriteVendor.count({
      where: {
        vendorId,
      },
    });
  }

  async countVendorFollowersInRange(data: {
    vendorId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<number> {
    return this.prisma.favoriteVendor.count({
      where: {
        vendorId: data.vendorId,
        createdAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
      },
    });
  }

  async findVendorFollowers(data: {
    vendorId: string;
    page: number;
    limit: number;
  }): Promise<{
    total: number;
    followers: {
      id: string;
      createdAt: Date;
      customer: {
        id: string;
        avatar: string | null;
        user: {
          name: string | null;
          email: string;
        };
        orders: {
          id: string;
        }[];
      };
    }[];
  }> {
    const skip = (data.page - 1) * data.limit;

    const [total, followers] = await Promise.all([
      this.prisma.favoriteVendor.count({
        where: {
          vendorId: data.vendorId,
        },
      }),

      this.prisma.favoriteVendor.findMany({
        where: {
          vendorId: data.vendorId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: data.limit,
        select: {
          id: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              avatar: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
              orders: {
                where: {
                  vendorId: data.vendorId,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      followers,
    };
  }

  async createVendorProfileViewOncePerDay(data: {
    vendorId: string;
    customerId?: string;
  }): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    if (data.customerId) {
      const existing = await this.prisma.vendorProfileView.findFirst({
        where: {
          vendorId: data.vendorId,
          customerId: data.customerId,
          viewedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        return;
      }
    }

    await this.prisma.vendorProfileView.create({
      data: {
        vendorId: data.vendorId,
        customerId: data.customerId,
      },
    });
  }

  async findCustomerIdByUserId(userId: string): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!customer || !customer.isActive) {
      return null;
    }

    return customer.id;
  }
}
