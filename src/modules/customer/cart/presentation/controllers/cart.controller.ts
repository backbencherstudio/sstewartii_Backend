import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from '../../application/cart.service';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { AddCartItemDto } from '../dto/cart.dto';
import { CartResponseDto } from '../dto/cart.response.dto';
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

}