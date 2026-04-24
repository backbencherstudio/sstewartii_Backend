import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AddCartItemDto } from '../presentation/dto/cart.dto';
import { CartResponseDto } from '../presentation/dto/cart.response.dto';
import type { ICartRepository } from '../domain/interface/cart.repository.interface';
import { CartMapper } from '../infrastructure/mapper/cart.mapper';
import { CustomerService } from '../../customer/application/customer.service';
import { ProductService } from '@/modules/product/application/product.service';


@Injectable()
export class CartService {
  constructor(
    @Inject('ICartRepository')
    private readonly cartRepository: ICartRepository,
    private readonly customerRepo: CustomerService,
    private readonly productRepo: ProductService,
  ) {}

  async addItem(
    userId: string,
    dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    const customer = await this.customerRepo.findActiveByUserId(userId);

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
}