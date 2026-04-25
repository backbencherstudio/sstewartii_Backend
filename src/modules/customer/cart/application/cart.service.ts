import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';

import type { ICartRepository } from '../domain/interface/cart.repository.interface';
import { CartMapper } from '../infrastructure/mapper/cart.mapper';

import { AddCartItemDto } from '../presentation/dto/cart.dto';
import { 
  CartResponseDto,
  CartListResponseDto,
  CartDetailResponseDto,
} from '../presentation/dto/cart.response.dto';

import { CustomerService } from '../../customer/application/customer.service';
import { ProductService } from '@/modules/product/application/product.service';


@Injectable()
export class CartService {
  constructor(
    @Inject('ICartRepository')
    private readonly cartRepository: ICartRepository,
    private readonly customerService: CustomerService,
    private readonly productRepo: ProductService,
  ) {}

  async addItem(
    userId: string,
    dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const product = await this.productRepo.findActiveProductForCart(
      dto.productId,
    );

    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    this.validateProductOptions(dto, product);

    const cart = await this.cartRepository.findOrCreateCart({
      customerId: customer.id,
      vendorId: product.vendorId,
    });

    await this.cartRepository.createCartItem({
      cartId: cart.id,
      productId: product.id,
      quantity: dto.quantity,
      price: product.price,
      sizeOptionId: dto.sizeOptionId,
      note: dto.note,
      choiceOptionIds: dto.choiceOptionIds,
      addOnIds: dto.addOnIds,
    });

    await this.cartRepository.recalculateCartTotal(cart.id);

    const updatedCart = await this.cartRepository.findCartById(cart.id);

    if (!updatedCart) {
      throw new NotFoundException('Cart not found after update');
    }

    return CartMapper.toResponse(updatedCart);
  }

  private validateProductOptions(
    dto: AddCartItemDto,
    product: any,
  ): void {
    if (dto.sizeOptionId) {
      const validSize = product.sizeOptions.some(
        (item: any) => item.id === dto.sizeOptionId,
      );

      if (!validSize) {
        throw new BadRequestException('Invalid size option');
      }
    }

    if (dto.choiceOptionIds?.length) {
      const validChoiceIds = new Set(
        product.choiceOptions.map((item: any) => item.id),
      );

      for (const choiceOptionId of dto.choiceOptionIds) {
        if (!validChoiceIds.has(choiceOptionId)) {
          throw new BadRequestException('Invalid choice option');
        }
      }
    }

    if (dto.addOnIds?.length) {
      const validAddOnIds = new Set(
        product.addOns.map((item: any) => item.id),
      );

      for (const addOnId of dto.addOnIds) {
        if (!validAddOnIds.has(addOnId)) {
          throw new BadRequestException('Invalid add-on');
        }
      }
    }
  }

  async getCartList(userId: string): Promise<CartListResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const carts = await this.cartRepository.findCartListByCustomerId(
      customer.id,
    );

    return CartMapper.toCartListResponse(carts);
  }

  async deleteCart(
    userId: string,
    cartId: string,
  ): Promise<{ success: boolean }> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const cart = await this.cartRepository.findCartOwner(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customer.id) {
      throw new BadRequestException('Unauthorized cart access');
    }

    await this.cartRepository.deleteCart(cartId);

    return { success: true };
  }

  async getCartDetail(
    userId: string,
    cartId: string,
  ): Promise<CartDetailResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const cart = await this.cartRepository.findCartById(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customer.id) {
      throw new BadRequestException('Unauthorized access');
    }

    const availability = this.resolveAvailability(
      cart.vendor.operationHours,
    );

    const items = cart.items.map((item: any) => {
      let isAvailable = true;
      let reason: string | undefined;

      if (!item.product.isActive) {
        isAvailable = false;
        reason = 'Product is no longer available';
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images?.[0]?.url,

        quantity: item.quantity,

        unitPrice: item.price,
        sizePrice: item.sizeOption?.price ?? 0,

        addOnTotal: item.addOns.reduce(
          (acc: number, a: any) => acc + a.addOn.price,
          0,
        ),

        lineTotal: 0, 

        note: item.note,

        isAvailable,
        unavailableReason: reason,

        sizeOption: item.sizeOption
          ? {
              id: item.sizeOption.id,
              name: item.sizeOption.name,
            }
          : undefined,

        addOns: item.addOns.map((a: any) => ({
          id: a.addOn.id,
          name: a.addOn.name,
          price: a.addOn.price,
        })),
      };
    });

    let subtotal = 0;

    for (const item of items) {
      const lineTotal =
        (item.unitPrice + item.sizePrice + item.addOnTotal) *
        item.quantity;

      item.lineTotal = lineTotal;

      subtotal += lineTotal;
    }

    const tax = subtotal * 0.05;
    const serviceFee = 2;

    const total = subtotal + tax + serviceFee;

    const errors: string[] = [];

    if (!availability.isOpen) {
      errors.push('Vendor is closed');
    }

    const hasUnavailableItems = items.some((i) => !i.isAvailable);

    if (hasUnavailableItems) {
      errors.push('Some items are unavailable');
    }

    if (subtotal <= 0) {
      errors.push('Cart is empty');
    }

    const canCheckout = errors.length === 0;

    return {
      cartId: cart.id,

      vendor: {
        id: cart.vendor.id,
        businessName: cart.vendor.businessName,
        isOpen: availability.isOpen,
        statusLabel: availability.label,
        address: cart.vendor.serviceArea?.address,
      },

      items,

      pricing: {
        subtotal,
        tax,
        serviceFee,
        total,
      },

      validation: {
        canCheckout,
        errors,
      },
    };
  }

  private resolveAvailability(
    operationHours: Array<{
      dayOfWeek: number;
      openTime: string | null;
      closeTime: string | null;
      isClosed: boolean;
      activeFrom: Date;
      activeTo: Date | null;
    }> = [],
  ): { isOpen: boolean; label: string } {
    if (!operationHours.length) {
      return {
        isOpen: false,
        label: 'Temporarily Closed',
      };
    }

    const now = new Date();
    const today = now.getDay();

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const todaysHours = operationHours
      .filter(
        (item) =>
          item.dayOfWeek === today &&
          item.activeFrom <= now &&
          (!item.activeTo || item.activeTo >= now),
      )
      .sort((a, b) => (a.openTime ?? '').localeCompare(b.openTime ?? ''));

    if (!todaysHours.length) {
      return {
        isOpen: false,
        label: 'Temporarily Closed',
      };
    }

    const currentSlot = todaysHours.find((item) => {
      if (item.isClosed || !item.openTime || !item.closeTime) {
        return false;
      }

      return currentTime >= item.openTime && currentTime <= item.closeTime;
    });

    if (currentSlot) {
      return {
        isOpen: true,
        label: 'Open Now',
      };
    }

    const nextSlot = todaysHours.find(
      (item) =>
        !item.isClosed &&
        item.openTime !== null &&
        item.openTime > currentTime,
    );

    if (nextSlot?.openTime) {
      return {
        isOpen: false,
        label: `Opens at ${this.formatTime(nextSlot.openTime)}`,
      };
    }

    return {
      isOpen: false,
      label: 'Temporarily Closed',
    };
  }

  private formatTime(time: string): string {  
    const [hourStr, minute] = time.split(':');
    const hour = Number(hourStr);

    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${formattedHour}:${minute} ${period}`;
  }

}