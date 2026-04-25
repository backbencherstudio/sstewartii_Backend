import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  ICartRepository,
  CreateCartItemInput,
  CartOwnerView,
} from '../../domain/interface/cart.repository.interface';

@Injectable()
export class CartRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateCart(data: {
    customerId: string;
    vendorId: string;
  }): Promise<CartOwnerView> {
    const existing = await this.prisma.cart.findUnique({
      where: {
        customerId_vendorId: {
          customerId: data.customerId,
          vendorId: data.vendorId,
        },
      },
      select: {
        id: true,
        customerId: true,
        vendorId: true,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({
      data: {
        customerId: data.customerId,
        vendorId: data.vendorId,
      },
      select: {
        id: true,
        customerId: true,
        vendorId: true,
      },
    });
  }

  async findCartById(cartId: string): Promise<any | null> {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        vendor: true,
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              include: {
                vendor: true,
                images: {
                  orderBy: { position: 'asc' },
                },
              },
            },
            sizeOption: true,
            choiceOptions: {
              include: {
                choiceOption: true,
              },
            },
            addOns: {
              include: {
                addOn: true,
              },
            },
          },
        },
      },
    });
  }

  async createCartItem(input: CreateCartItemInput): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const item = await tx.cartItem.create({
        data: {
          cartId: input.cartId,
          productId: input.productId,
          quantity: input.quantity,
          price: input.price,
          sizeOptionId: input.sizeOptionId,
          note: input.note,
        },
      });

      if (input.choiceOptionIds?.length) {
        await tx.cartItemChoiceOption.createMany({
          data: input.choiceOptionIds.map((choiceOptionId) => ({
            cartItemId: item.id,
            choiceOptionId,
          })),
        });
      }

      if (input.addOnIds?.length) {
        await tx.cartItemAddOn.createMany({
          data: input.addOnIds.map((addOnId) => ({
            cartItemId: item.id,
            addOnId,
          })),
        });
      }
    });
  }

  async recalculateCartTotal(cartId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            sizeOption: true,
            addOns: {
              include: {
                addOn: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return;
    }

    const totalAmount = cart.items.reduce((sum, item) => {
      const sizePrice = item.sizeOption?.price ?? 0;

      const addOnTotal = item.addOns.reduce(
        (acc, entry) => acc + entry.addOn.price,
        0,
      );

      return sum + (item.price + sizePrice + addOnTotal) * item.quantity;
    }, 0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { totalAmount },
    });
  }

  async findCartListByCustomerId(customerId: string): Promise<any[]> {
    return this.prisma.cart.findMany({
      where: {
        customerId,
        items: {
          some: {},
        },
      },
      include: {
        vendor: {
          include: {
            serviceArea: true,
            truckGalleryImages: {
              where: {
                isPrimary: true,
              },
              take: 1,
            },
          },
        },
        items: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    position: 'asc',
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findCartOwner(cartId: string): Promise<{ id: string; customerId: string } | null> {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        customerId: true,
      },
    });
  }

}