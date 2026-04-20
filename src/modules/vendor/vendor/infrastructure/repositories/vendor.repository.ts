import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IVendorRepository } from '../../domain/interface/vendor.repository.interface';
import { Vendor } from '../../domain/entities/vendor.entity';
import { VendorMapper } from '../mapper/vendor.mapper';
import { Prisma, PrismaClient } from '@prisma/client';
import { VendorMenuQueryDto } from '../../presentation/dto/vendor.dto';

@Injectable()
export class VendorRepository implements IVendorRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}