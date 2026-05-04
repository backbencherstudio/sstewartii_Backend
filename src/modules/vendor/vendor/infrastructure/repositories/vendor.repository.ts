import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PrismaClient, OrderStatus } from '@prisma/client';

import { IVendorRepository } from '../../domain/interface/vendor.repository.interface';
import { Vendor } from '../../domain/entities/vendor.entity';

import { VendorMapper } from '../mapper/vendor.mapper';

import { VendorMenuQueryDto } from '../../presentation/dto/vendor.dto';

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
}