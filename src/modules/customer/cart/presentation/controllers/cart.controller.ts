import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
} from '@nestjs/common';


import { AddCartItemDto, } from '../dto/cart.dto';

import { 
  CartResponseDto,
  CartListResponseDto,
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
    @Body() dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  // Get api for cart list
  @Get('get-cart-items')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getCartList(
    @CurrentUser() user: AuthUser,
  ): Promise<CartListResponseDto> {
    return this.cartService.getCartList(user.id);
  }

}