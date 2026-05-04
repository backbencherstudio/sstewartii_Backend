import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';

import type { ICartRepository, CreateCartItemInput } from '../domain/interface/cart.repository.interface';
import { CartMapper } from '../infrastructure/mapper/cart.mapper';

import { 
  AddCartItemsDto,
  AddCartItemPayloadDto
} from '../presentation/dto/cart.dto';
import { 
  CartResponseDto,
  CartListResponseDto,
  CartDetailResponseDto,
} from '../presentation/dto/cart.response.dto';

import { CustomerService } from '../../customer/application/customer.service';
import { ProductService } from '@/modules/product/application/product.service';
import { MediaService } from '@/common/media/media.service';

@Injectable()
export class CartService {
  constructor(
    @Inject('ICartRepository')
    private readonly cartRepository: ICartRepository,
    private readonly customerService: CustomerService,
    private readonly productRepo: ProductService,
    private readonly cartMapper: CartMapper,
    private readonly mediaService: MediaService,
  ) {}

  async addItems(
    userId: string,
    dto: AddCartItemsDto,
  ): Promise<CartResponseDto> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const normalizedItems = this.normalizeRequestedItems(dto.items);

    const productResults = await Promise.all(
      normalizedItems.map((item) =>
        this.productRepo.findActiveProductForCart(item.productId),
      ),
    );

    const products = this.assertProductsFound(
      productResults,
      normalizedItems,
    );

    const productMap = new Map<string, (typeof products)[number]>();

    for (const product of products) {
      productMap.set(product.id, product);
    }

    const vendorIds = new Set(products.map((product) => product.vendorId));

    if (vendorIds.size > 1) {
      throw new BadRequestException(
        'All selected items must belong to the same vendor',
      );
    }

    const vendorId = products[0].vendorId;

    const itemsWithResolvedOptions = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(
          `Product not found or inactive: ${item.productId}`,
        );
      }

      const sizeOptionId = this.resolveSizeOptionId(
        item.sizeOptionId,
        product,
      );

      const resolvedItem: AddCartItemPayloadDto = {
        ...item,
        sizeOptionId,
      };

      this.validateProductOptions(resolvedItem, product);

      return resolvedItem;
    });

    const cart = await this.cartRepository.findOrCreateCart({
      customerId: customer.id,
      vendorId,
    });

    const createInputs: CreateCartItemInput[] = itemsWithResolvedOptions.map(
      (item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new NotFoundException(
            `Product not found or inactive: ${item.productId}`,
          );
        }

        return {
          cartId: cart.id,
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          sizeOptionId: item.sizeOptionId,
          note: item.note,
          choiceOptionIds: item.choiceOptionIds,
          addOnIds: item.addOnIds,
        };
      },
    );

    await this.cartRepository.createCartItems(createInputs);

    await this.cartRepository.recalculateCartTotal(cart.id);

    const updatedCart = await this.cartRepository.findCartById(cart.id);

    if (!updatedCart) {
      throw new NotFoundException('Cart not found after update');
    }

    return CartMapper.toResponse(updatedCart);
  }

  async findCartById(cartId: string): Promise<any | null> {
    return this.cartRepository.findCartById(cartId);
  }

  private resolveSizeOptionId(
    requestedSizeOptionId: string | undefined,
    product: any,
  ): string | undefined {
    if (requestedSizeOptionId) {
      return requestedSizeOptionId;
    }

    const sizeOptions = product.sizeOptions ?? [];

    if (!sizeOptions.length) {
      return undefined;
    }

    const requiredSizeOptions = sizeOptions.filter(
      (option: any) => option.isRequired === true,
    );

    if (requiredSizeOptions.length) {
      const defaultRequiredSize = [...requiredSizeOptions].sort(
        (a: any, b: any) => a.price - b.price,
      )[0];

      return defaultRequiredSize.id;
    }

    const cheapestSize = [...sizeOptions].sort(
      (a: any, b: any) => a.price - b.price,
    )[0];

    return cheapestSize.id;
  }

  private assertProductsFound<T>(
    products: Array<T | null>,
    requestedItems: AddCartItemPayloadDto[],
  ): T[] {
    const missingProductIndex = products.findIndex(
      (product) => product === null,
    );

    if (missingProductIndex !== -1) {
      throw new NotFoundException(
        `Product not found or inactive: ${requestedItems[missingProductIndex].productId}`,
      );
    }

    return products.filter((product): product is T => product !== null);
  }

  private normalizeRequestedItems(
    items: AddCartItemPayloadDto[],
  ): AddCartItemPayloadDto[] {
    return items.map((item) => ({
      ...item,
      quantity: item.quantity ?? 1,
      choiceOptionIds: item.choiceOptionIds ?? [],
      addOnIds: item.addOnIds ?? [],
    }));
  }

  private validateProductOptions(
    dto: AddCartItemPayloadDto,
    product: any,
  ): void {
    const sizeOptions = product.sizeOptions ?? [];

    const hasRequiredSize = sizeOptions.some(
      (item: any) => item.isRequired === true,
    );

    if (hasRequiredSize && !dto.sizeOptionId) {
      throw new BadRequestException(
        `Size option is required for product ${product.name}`,
      );
    }

    if (dto.sizeOptionId) {
      const validSize = sizeOptions.some(
        (item: any) => item.id === dto.sizeOptionId,
      );

      if (!validSize) {
        throw new BadRequestException(
          `Invalid size option for product ${product.name}`,
        );
      }
    }

    if (dto.choiceOptionIds?.length) {
      const validChoiceIds = new Set(
        product.choiceOptions.map((item: any) => item.id),
      );

      for (const choiceOptionId of dto.choiceOptionIds) {
        if (!validChoiceIds.has(choiceOptionId)) {
          throw new BadRequestException(
            `Invalid choice option for product ${product.name}`,
          );
        }
      }
    }

    if (dto.addOnIds?.length) {
      const validAddOnIds = new Set(
        product.addOns.map((item: any) => item.id),
      );

      for (const addOnId of dto.addOnIds) {
        if (!validAddOnIds.has(addOnId)) {
          throw new BadRequestException(
            `Invalid add-on for product ${product.name}`,
          );
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

    return this.cartMapper.toCartListResponse(carts);
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
        productImage: this.mediaService.getUrl(item.product.images?.[0]?.url),

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

  async increaseItemQuantity(
    userId: string,
    itemId: string,
  ): Promise<CartResponseDto> {
    const { item, cartId } = await this.validateCartItemOwner(userId, itemId);

    await this.cartRepository.updateCartItemQuantity(
      item.id,
      item.quantity + 1,
    );

    await this.cartRepository.recalculateCartTotal(cartId);

    const cart = await this.cartRepository.findCartById(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return CartMapper.toResponse(cart);
  }

  private async validateCartItemOwner(
    userId: string,
    itemId: string,
  ): Promise<{
    item: {
      id: string;
      cartId: string;
      quantity: number;
      cart: {
        customerId: string;
      };
    };
    cartId: string;
  }> {
    const customer = await this.customerService.findActiveByUserId(userId);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const item = await this.cartRepository.findCartItemOwner(itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.cart.customerId !== customer.id) {
      throw new ForbiddenException('You cannot modify this cart item');
    }

    return {
      item,
      cartId: item.cartId,
    };
  }

  async decreaseItemQuantity(
    userId: string,
    itemId: string,
  ): Promise<CartResponseDto | { message: string }> {
    const { item, cartId } = await this.validateCartItemOwner(userId, itemId);

    if (item.quantity <= 1) {
      await this.cartRepository.deleteCartItem(item.id);
      await this.cartRepository.deleteCartIfEmpty(cartId);

      const cart = await this.cartRepository.findCartById(cartId);

      if (!cart) {
        return {
          message: 'Cart item removed and cart is now empty',
        };
      }

      await this.cartRepository.recalculateCartTotal(cartId);

      const updatedCart = await this.cartRepository.findCartById(cartId);

      if (!updatedCart) {
        return {
          message: 'Cart item removed and cart is now empty',
        };
      }

      return CartMapper.toResponse(updatedCart);
    }

    await this.cartRepository.updateCartItemQuantity(
      item.id,
      item.quantity - 1,
    );

    await this.cartRepository.recalculateCartTotal(cartId);

    const cart = await this.cartRepository.findCartById(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return CartMapper.toResponse(cart);
  }

}