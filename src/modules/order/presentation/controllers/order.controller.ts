import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Patch,
} from '@nestjs/common';

import { 
  OrderSummaryResponseDto,
  OrderTrackResponseDto,
} from '../dto/order.response.dto';

import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { OrderService } from '../../application/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderResponseDto } from '../dto/order.response.dto';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';


@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create-new')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Order created successfully.')
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    return this.orderService.createOrder(user.id, dto);
  }

  @Get('user/:orderId/summary')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getUserOrderSummary(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<OrderSummaryResponseDto> {
    return this.orderService.getUserOrderSummary(user.id, orderId);
  }

  @Get('user/:orderId/track')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  async getUserOrderTrack(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<OrderTrackResponseDto> {
    return this.orderService.getUserOrderTrack(user.id, orderId);
  }

  @Patch(':orderId/cancel')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Order cancelled successfully.')
  async userCancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<OrderTrackResponseDto> {
    return this.orderService.userCancelOrder(user.id, orderId);
  }
}