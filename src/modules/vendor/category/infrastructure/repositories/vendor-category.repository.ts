import { Injectable } from '@nestjs/common';
import { VendorCategory } from '../../domain/entities/vendor-category.entity';
import { IVendorCategoryRepository } from '../../domain/interfaces/vendor-category.repository.interface';
import { VendorCategoryMapper } from '../mappers/vendor-category.mapper';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class VendorCategoryRepository implements IVendorCategoryRepository {
  constructor(
    private prisma: PrismaService,
    private mapper: VendorCategoryMapper,
  ) {}

  async create(data: {
    vendorId: string;
    name: string;
    position: number;
  }): Promise<VendorCategory> {
    const category = await this.prisma.category.create({
      data: {
        vendorId: data.vendorId,
        name: data.name,
        position: data.position,
        isActive: true,
      },
    });
    return this.mapper.toDomain(category);
  }

  async findAll(vendorId: string): Promise<VendorCategory[]> {
    const categories = await this.prisma.category.findMany({
      where: { vendorId },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: {
            products: {
              where: {
                vendorId,
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    return categories.map((cat) =>
      this.mapper.toDomainWithCount(cat, vendorId),
    );
  }

  async findAllWithProducts(vendorId: string): Promise<VendorCategory[]> {
    const categories = await this.prisma.category.findMany({
      where: { vendorId },
      orderBy: { position: 'asc' },
      include: {
        products: {
          where: {
            vendorId,
            isDeleted: false,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            description: true,
            estimateCookTime: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
        _count: {
          select: {
            products: {
              where: {
                vendorId,
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    return categories.map((cat) =>
      this.mapper.toDomainWithProducts(cat, vendorId),
    );
  }

  async findByIdWithProducts(
    vendorId: string,
    id: string,
  ): Promise<VendorCategory | null> {
    const category = await this.prisma.category.findFirst({
      where: { id, vendorId },
      include: {
        products: {
          where: {
            vendorId,
            isDeleted: false,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            description: true,
            estimateCookTime: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
        _count: {
          select: {
            products: {
              where: {
                vendorId,
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    return category
      ? this.mapper.toDomainWithProducts(category, vendorId)
      : null;
  }

  async findById(vendorId: string, id: string): Promise<VendorCategory | null> {
    const category = await this.prisma.category.findFirst({
      where: { id, vendorId },
      include: {
        _count: {
          select: {
            products: {
              where: {
                vendorId,
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    return category ? this.mapper.toDomainWithCount(category, vendorId) : null;
  }

  async findByName(
    vendorId: string,
    name: string,
  ): Promise<VendorCategory | null> {
    const category = await this.prisma.category.findFirst({
      where: { vendorId, name },
    });

    return category ? this.mapper.toDomain(category) : null;
  }

  async update(
    vendorId: string,
    id: string,
    data: Partial<VendorCategory>,
  ): Promise<VendorCategory> {
    const category = await this.prisma.category.update({
      where: { id, vendorId },
      data: {
        name: data.name,
        position: data.position,
        isActive: data.isActive,
      },
    });

    return this.mapper.toDomain(category);
  }

  async delete(vendorId: string, id: string): Promise<void> {
    await this.prisma.category.delete({
      where: { id, vendorId },
    });
  }

  async getProductCount(vendorId: string, categoryId: string): Promise<number> {
    const count = await this.prisma.product.count({
      where: {
        categoryId,
        vendorId,
        isDeleted: false,
      },
    });
    return count;
  }

  async isCategoryEmpty(
    vendorId: string,
    categoryId: string,
  ): Promise<boolean> {
    const count = await this.getProductCount(vendorId, categoryId);
    return count === 0;
  }

  async getMaxPosition(vendorId: string): Promise<number> {
    const result = await this.prisma.category.aggregate({
      where: { vendorId },
      _max: { position: true },
    });
    return result._max?.position ?? 0;
  }
}
