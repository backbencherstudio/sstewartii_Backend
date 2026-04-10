import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ICategoryRepository } from '../../domain/interfaces/category.interface';
import { Category } from '../../domain/entities/category.entity';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Category): Promise<Category> {
    const created = await this.prisma.category.create({
      data: {
        id: data.id,
        name: data.name,
        vendorId: data.vendorId,
      },
    });

    return new Category(
      created.id,
      created.name,
      created.vendorId,
      created.createdAt,
      created.updatedAt,
    );
  }

  async findByVendorId(vendorId: string): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map(
      (c) =>
        new Category(
          c.id,
          c.name,
          c.vendorId,
          c.createdAt,
          c.updatedAt,
        ),
    );
  }

  async findByName(
    vendorId: string,
    name: string,
  ): Promise<Category | null> {
    const record = await this.prisma.category.findFirst({
      where: {
        vendorId,
        name,
      },
    });

    if (!record) return null;

    return new Category(
      record.id,
      record.name,
      record.vendorId,
      record.createdAt,
      record.updatedAt,
    );
  }
}