import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ICategoryRepository,
  CategorySearchView,
} from '../../domain/interfaces/category.interface';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchCategories(keyword?: string): Promise<CategorySearchView[]> {
    const search = keyword?.trim();

    const where: Prisma.CategoryWhereInput = {
      isActive: true,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };

    return this.prisma.category.findMany({
      where,
      take: 20,
      orderBy: [
        {
          position: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
      },
    });
  }
}
