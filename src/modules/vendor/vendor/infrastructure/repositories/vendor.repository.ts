import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma,
  OrderStatus,
  VendorLiveStatus,
  VerificationStatus,
  KycStatus,
  SubscriptionStatus, 
} from '@prisma/client';

import { IVendorRepository } from '../../domain/interface/vendor.repository.interface';
import { Vendor } from '../../domain/entities/vendor.entity';

import { VendorMapper } from '../mapper/vendor.mapper';

import { 
  VendorMenuQueryDto,
  VendorMenuItemsQueryDto,
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
    const vendorRecord = await this.prisma.vendor.findUnique({
      where: { ownerId },
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
        categories: {
          orderBy: {
            name: 'asc',
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
    await this.prisma.truckGalleryImage .createMany({
      data: data.images.map((image, index) => ({
        vendorId: data.vendorId,
        url: image.url,
        caption: image.caption,
        isPrimary: image.isPrimary ?? false,
        position: image.position ?? index,
      })),
    });
  }

  // async findTruckGalleryByVendorId(vendorId: string): Promise<{
  //   id: string;
  //   truckGalleryImages: {
  //     id: string;
  //     url: string;
  //     caption: string | null;
  //     isPrimary: boolean;
  //     position: number;
  //     createdAt: Date;
  //   }[];
  // } | null> {
  //   return this.prisma.vendor.findUnique({
  //     where: { id: vendorId },
  //     select: {
  //       id: true,
  //       truckGalleryImages: {
  //         orderBy: [
  //           { isPrimary: 'desc' },
  //           { position: 'asc' },
  //           { createdAt: 'asc' },
  //         ],
  //         select: {
  //           id: true,
  //           url: true,
  //           caption: true,
  //           isPrimary: true,
  //           position: true,
  //           createdAt: true,
  //         },
  //       },
  //     },
  //   });
  // }

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
    const [completedAggregate, ordersCompleted, pendingOrders, cancelledOrders] =
      await Promise.all([
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

  async findGoLiveEligibilityByOwnerId(
    ownerId: string,
  ): Promise<{
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
    return this.prisma.vendor.findUnique({
      where: {
        ownerId,
      },
      select: {
        id: true,
        businessName: true,
        categories: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            name: true,
            products: {
              where: {
                vendor: {
                  ownerId,
                },
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
                images: {
                  orderBy: {
                    position: 'asc',
                  },
                  select: {
                    id: true,
                    url: true,
                    position: true,
                  },
                },
              },
            },
          },
        },
      },
    });
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
}