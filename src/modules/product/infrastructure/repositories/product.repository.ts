import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IProductRepository } from '../../domain/interfaces/product.interface';
import { Product } from '../../domain/entities/product.entity';
import { ProductMapper } from '../mappers/product.mapper';
import { Prisma } from '@prisma/client';

  type ProductDetailPrisma = Prisma.ProductGetPayload<{
    include: {
      category: true;
      images: true;
      sizeOptions: true;
      choiceOptions: true;
      addOns: true;
      vendor: {
        include: {
          cuisines: {
            include: {
              cuisine: true;
            };
          };
        };
      };
    };
  }>;

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFullProduct(data: {
    vendorId: string;
    dto: any;
    images: string[];
  }): Promise<Product> {
    const { vendorId, dto, images } = data;

    const raw = await this.prisma.$transaction(async (tx) => {
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

      return tx.product.findUniqueOrThrow({
          where: { id: product.id },
          include: { category: true },
        });
      });

   return ProductMapper.toDomain(raw);
  }
  
  async findProductByVendorId(vendorId: string): Promise<Product[]> {

    const raws = await this.prisma.product.findMany({
      where: { vendorId },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return raws.map(ProductMapper.toDomain);
  }

  async searchProducts(params: {
    vendorId: string;
    search?: string;
    category?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }): Promise<Product[]> {

    const { vendorId, search, category,  isActive,  page, limit,  } = params;

    const raws = await this.prisma.product.findMany({
      where: {
        vendorId,

        ...(isActive !== undefined && { isActive }),

        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive', 
          },
        }),

        ...(category && {
          category: {
            name: {
              equals: category,
              mode: 'insensitive',
            },
          },
        }),
      },

      include: {
        category: true,
      },

      orderBy: {
        createdAt: 'desc',
      },

      skip: (page - 1) * limit,
      take: limit,
    });

    return raws.map(ProductMapper.toDomain);
  }

  async findProductByIdAndVendorId(
  productId: string,
  vendorId: string,
  ): Promise<Product | null> {
    const raw = await this.prisma.product.findFirst({
      where: {
        id: productId,
        vendorId,
      },
      include: {
        category: true,
        images: true,
        sizeOptions: true,
        choiceOptions: true,
        addOns: true,
      },
    });

    return raw ? ProductMapper.toDomain(raw) : null; 
  }

  async updateProductStatus(
    productId: string,
    isActive: boolean,
  ): Promise<Product> {
    const raw = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive },
      include: {
        category: true,
        images: true,
        sizeOptions: true,
        choiceOptions: true,
        addOns: true,
      },
    });

    return ProductMapper.toDomain(raw);            
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id: productId },
    });
  }
  
  async findProductDetailById(
    productId: string,
  ): Promise<ProductDetailPrisma | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
      include: {
        category: true,

        images: {
          orderBy: { position: 'asc' },
        },

        sizeOptions: true,
        choiceOptions: true,
        addOns: true,

        vendor: {
          include: {
            cuisines: {
              include: {
                cuisine: true,
              },
            },
          },
        },
      },
    });
  }
}