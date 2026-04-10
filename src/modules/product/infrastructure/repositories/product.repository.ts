import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IProductRepository } from '../../domain/interfaces/product.interface';
import { Product } from '@prisma/client';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFullProduct(data: {
    vendorId: string;
    dto: any;
    images: string[];
  }): Promise<Product> {
    const { vendorId, dto, images } = data;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          estimateCookTime: dto.estimateCookTime,
          vendorId,
          categoryId: dto.categoryId,
        },
      });

      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((url, index) => ({
            productId: product.id,
            url,
            isPrimary: index === 0,
            position: index,
          })),
        });
      }

      if (dto.sizeOptions?.length) {
        await tx.sizeOption.createMany({
          data: dto.sizeOptions.map((s) => ({
            ...s,
            productId: product.id,
          })),
        });
      }

      if (dto.choiceOptions?.length) {
        await tx.choiceOption.createMany({
          data: dto.choiceOptions.map((c) => ({
            ...c,
            productId: product.id,
          })),
        });
      }

      if (dto.addOns?.length) {
        await tx.addOn.createMany({
          data: dto.addOns.map((a) => ({
            ...a,
            productId: product.id,
          })),
        });
      }

      return product;
    });
  }
}