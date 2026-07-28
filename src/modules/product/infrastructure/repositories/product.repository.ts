import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IProductRepository } from '../../domain/interfaces/product.interface';
import { Product } from '../../domain/entities/product.entity';
import { ProductMapper } from '../mappers/product.mapper';
import { Prisma } from '@prisma/client';
import { ProductCart } from '../../domain/entities/product.entity';
import { ProductCartMapper } from '../mappers/product.mapper';
import { CreateProductDto } from '../../presentation/dto/product.dto';

type ProductDetailPrisma = Prisma.ProductGetPayload<{
  include: {
    category: true;
    cuisine: true;
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

  async findActiveProductForCart(
    productId: string,
  ): Promise<ProductCart | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
      include: {
        sizeOptions: {
          orderBy: {
            price: 'asc',
          },
        },
        choiceOptions: true,
        addOns: true,
      },
    });

    if (!product) {
      return null;
    }

    return ProductCartMapper.toDomain(product);
  }

  async createFullProduct(data: {
    vendorId: string;
    dto: CreateProductDto;
    images: string[];
  }): Promise<any> {
    const { vendorId, dto, images } = data;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          estimateCookTime: dto.estimateCookTime,
          vendorId,

          categoryId: dto.categoryId ?? null,
          cuisineId: dto.cuisineId ?? null,
        },
        select: {
          id: true,
        },
      });

      if (images.length > 0) {
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
          data: dto.sizeOptions.map((size) => ({
            productId: product.id,
            name: size.name,
            price: size.price,
            isRequired: size.isRequired ?? false,
          })),
        });
      }

      if (dto.choiceOptions?.length) {
        await tx.choiceOption.createMany({
          data: dto.choiceOptions.map((choice) => ({
            productId: product.id,
            name: choice.name,
            price: choice.price,
            isRequired: choice.isRequired ?? false,
          })),
        });
      }

      if (dto.addOns?.length) {
        await tx.addOn.createMany({
          data: dto.addOns.map((addOn) => ({
            productId: product.id,
            name: addOn.name,
            price: addOn.price,
            isRequired: addOn.isRequired ?? false,
          })),
        });
      }

      if (dto.cuisineId) {
        await tx.vendorCuisine.upsert({
          where: {
            vendorId_cuisineId: {
              vendorId,
              cuisineId: dto.cuisineId,
            },
          },
          update: {},
          create: {
            vendorId,
            cuisineId: dto.cuisineId,
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: {
          id: product.id,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },

          cuisine: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },

          images: {
            orderBy: [
              {
                isPrimary: 'desc',
              },
              {
                position: 'asc',
              },
            ],
            select: {
              id: true,
              url: true,
              isPrimary: true,
              position: true,
            },
          },

          sizeOptions: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              name: true,
              price: true,
              isRequired: true,
            },
          },

          choiceOptions: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              name: true,
              price: true,
              isRequired: true,
            },
          },

          addOns: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              name: true,
              price: true,
              isRequired: true,
            },
          },
        },
      });
    });
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
    const { vendorId, search, category, isActive, page, limit } = params;

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
        cuisine: true,
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

  async existsCuisineById(cuisineId: string): Promise<boolean> {
    const cuisine = await this.prisma.cuisine.findUnique({
      where: {
        id: cuisineId,
      },
      select: {
        id: true,
      },
    });

    return !!cuisine;
  }

  async existsActiveCategoryById(categoryId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return !!category;
  }
}
