import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Delete,
  Param,
  Patch,
} from '@nestjs/common';

import { AddCartItemsDto } from '../dto/cart.dto';

import {
  CartResponseDto,
  CartListResponseDto,
  CartDetailResponseDto,
} from '../dto/cart.response.dto';

import { CartService } from '../../application/cart.service';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';

import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add-cart-items')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Item added to cart successfully.')
  async addItem(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddCartItemsDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItems(user.id, dto);
  }

  @Get('get-cart-items')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getCartList(
    @CurrentUser() user: AuthUser,
  ): Promise<CartListResponseDto> {
    return this.cartService.getCartList(user.id);
  }

  @Delete('delete/:cartId')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Cart deleted successfully')
  async deleteCart(
    @CurrentUser() user: AuthUser,
    @Param('cartId') cartId: string,
  ): Promise<{ success: boolean }> {
    return this.cartService.deleteCart(user.id, cartId);
  }

  @Get('detail/:cartId')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getCartDetail(
    @CurrentUser() user: AuthUser,
    @Param('cartId') cartId: string,
  ): Promise<CartDetailResponseDto> {
    return this.cartService.getCartDetail(user.id, cartId);
  }

  @Patch('items/:itemId/increase')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Cart item quantity increased successfully.')
  async increaseItemQuantity(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.increaseItemQuantity(user.id, itemId);
  }

  @Patch('items/:itemId/decrease')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Cart item quantity decreased successfully.')
  async decreaseItemQuantity(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto | { message: string }> {
    return this.cartService.decreaseItemQuantity(user.id, itemId);
  }
}
