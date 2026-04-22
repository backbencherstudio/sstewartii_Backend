import { Injectable } from '@nestjs/common';
import { Prisma, } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { ICustomerRepository } from '../../domain/interface/customer.repository.interface';
import { CustomerEntity } from '../../domain/entities/customer.entity';

import { 
  NearbyVendorsQueryDto,
  TopPicksQueryDto,
  ExploreMapQueryDto,
  FoodFilterQueryDto,
} from '../../presentation/dto/customer.dto';

@Injectable()
export class CustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<CustomerEntity | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) return null;

    return {
      id: customer.id,
      userId: customer.userId,
      phoneNumber: customer.phoneNumber ?? undefined,
      dateOfBirth: customer.dateOfBirth ?? undefined,
      address: customer.address ?? undefined,
      latitude: customer.latitude ?? undefined,
      longitude: customer.longitude ?? undefined,
      avatar: customer.avatar ?? undefined,
      isActive: customer.isActive,
      preferredRadius: customer.preferredRadius ?? undefined,
    };
  }

  async create(data: {
    userId: string;
    latitude: number;
    longitude: number;
    address?: string;
  }): Promise<any> {
    return this.prisma.customer.create({
      data,
    });
  }

  async updateLocation(
    userId: string,
    data: {
      latitude: number;
      longitude: number;
      address?: string;
    },
  ): Promise<any> {
    return this.prisma.customer.update({
      where: { userId },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
    });
  }

  async findNearbyVendorCandidates(
    query: NearbyVendorsQueryDto,
  ): Promise<any[]> {
    const search = query.search?.trim();
    const category = query.category?.trim();

    const where: Prisma.VendorWhereInput = {
      serviceArea: {
        isNot: null,
      },
    };

    const andConditions: Prisma.VendorWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          {
            businessName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            cuisines: {
              some: {
                cuisine: {
                  name: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
          {
            products: {
              some: {
                isActive: true,
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        ],
      });
    }

    if (category) {
      andConditions.push({
        OR: [
          {
            categories: {
              some: {
                name: {
                  contains: category,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            products: {
              some: {
                isActive: true,
                category: {
                  name: {
                    contains: category,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.prisma.vendor.findMany({
      where,
      include: {
        serviceArea: true,
        operationHours: true,
        cuisines: {
          include: {
            cuisine: true,
          },
        },
        products: {
          where: {
            isActive: true,
          },
          take: 1,
          include: {
            images: {
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        {
          reviewAverage: 'desc',
        },
        {
          reviewCount: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findTopPickProducts(
    query: TopPicksQueryDto,
  ): Promise<any[]> {
    const search = query.search?.trim();
    const category = query.category?.trim();

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      vendor: {
        serviceArea: {
          isNot: null,
        },
      },
    };

    const andConditions: Prisma.ProductWhereInput[] = [];

    if (search) {
      andConditions.push({
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      });
    }

    if (category) {
      andConditions.push({
        category: {
          name: {
            contains: category,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        vendor: {
          include: {
            serviceArea: true,
          },
        },
        category: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1,
        },
      },
      orderBy: [
        {
          vendor: {
            reviewAverage: 'desc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findExploreMapVendorCandidates(
    query: ExploreMapQueryDto,
  ): Promise<any[]> {
    const search = query.search?.trim();
    const category = query.category?.trim();

    const where: Prisma.VendorWhereInput = {
      serviceArea: {
        isNot: null,
      },
    };

    const andConditions: Prisma.VendorWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          {
            businessName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            cuisines: {
              some: {
                cuisine: {
                  name: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
          {
            products: {
              some: {
                isActive: true,
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
              },
            },
          },
        ],
      });
    }

    if (category) {
      andConditions.push({
        OR: [
          {
            categories: {
              some: {
                name: {
                  contains: category,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            products: {
              some: {
                isActive: true,
                category: {
                  name: {
                    contains: category,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.prisma.vendor.findMany({
      where,
      include: {
        serviceArea: true,
        operationHours: true,
        cuisines: {
          include: {
            cuisine: true,
          },
        },
        products: {
          where: { isActive: true },
          take: 1,
          include: {
            images: {
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { reviewAverage: 'desc' },
        { reviewCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findFoodCandidates(
    query: FoodFilterQueryDto,
  ): Promise<any[]> {
    const search = query.search?.trim();
    const category = query.category?.trim();
    const cuisine = query.cuisine?.trim();

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      vendor: {
        serviceArea: {
          isNot: null,
        },
        ...(query.minRating !== undefined
          ? {
              reviewAverage: {
                gte: query.minRating,
              },
            }
          : {}),
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
        ],
      });
    }

    if (category && category.toLowerCase() !== 'all') {
      andConditions.push({
        category: {
          name: {
            contains: category,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      });
    }

    if (cuisine && cuisine.toLowerCase() !== 'all') {
      andConditions.push({
        vendor: {
          cuisines: {
            some: {
              cuisine: {
                name: {
                  contains: cuisine,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1,
        },
        vendor: {
          include: {
            serviceArea: true,
            operationHours: true,
            cuisines: {
              include: {
                cuisine: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findActiveProductById(productId: string): Promise<{ id: string } | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
      select: { id: true },
    });
  }

  async findFavoriteProduct(
    customerId: string,
    productId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.favoriteProduct.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
      select: { id: true },
    });
  }

  async createFavoriteProduct(data: {
    customerId: string;
    productId: string;
  }): Promise<void> {
    await this.prisma.favoriteProduct.create({
      data,
    });
  }
}