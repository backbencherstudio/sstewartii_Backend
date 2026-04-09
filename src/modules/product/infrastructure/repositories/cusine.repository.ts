import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ICuisineRepository } from '../../domain/interfaces/cuisine.interface';
import { Cuisine } from '../../domain/entities/cuisine.entity';

@Injectable()
export class CuisineRepository implements ICuisineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVendorId(vendorId: string): Promise<Cuisine[]> {
    const records = await this.prisma.vendorCuisine.findMany({
      where: { vendorId },
      include: {
        cuisine: true,
      },
    });

    return records.map(
      (item) => new Cuisine(item.cuisine.id, item.cuisine.name),
    );
  }
}