import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';

import {
  VendorOrderHistoryQueryDto,
  CreateOrderReportDto,
} from '../dto/order.dto';
import { 
  CreateOrderDto,
  CancelOrderDto,
} from '../dto/create-order.dto';
import { 
  OrderSummaryResponseDto,
  OrderTrackResponseDto,
  CreateOrderResponseDto,
  VendorActiveOrdersResponseDto,
  VendorOrderDetailResponseDto,
  CancelVendorOrderResponseDto,
  VendorOrderActionResponseDto,
  VendorPendingOrdersResponseDto,
  VendorOrderHistoryResponseDto,
  CreateOrderReportResponseDto,
  VendorOrderReportResponseDto
} from '../dto/order.response.dto';

import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { OrderService } from '../../application/order.service';
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

  @Get('vendor/pending')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorPendingOrders(
    @CurrentUser() user: AuthUser,
  ): Promise<VendorPendingOrdersResponseDto> {
    console.log('hitted this route');
    return this.orderService.getVendorPendingOrders(user.id);
  }

  @Get('vendor/orders-history')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorOrderHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: VendorOrderHistoryQueryDto,
  ): Promise<VendorOrderHistoryResponseDto> {
    return this.orderService.getVendorOrderHistory(user.id, query);
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

  @Patch('user/:orderId/cancel')
  @UseGuards(RoleGuard)
  @Roles(Role.USER)
  @ResponseMessage('Order cancelled successfully.')
  async userCancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<OrderTrackResponseDto> {
    return this.orderService.userCancelOrder(user.id, orderId);
  }

  @Get('vendor/active-order')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorActiveOrders(
    @CurrentUser() user: AuthUser,
  ): Promise<VendorActiveOrdersResponseDto> {
    return this.orderService.getVendorActiveOrders(user.id);
  }

  @Get('vendor/:orderId')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorOrderDetail(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<VendorOrderDetailResponseDto> {
    return this.orderService.getVendorOrderDetail(user.id, orderId);
  }

  @Patch('vendor/:orderId/cancel')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Order cancelled successfully.')
  async cancelVendorOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<CancelVendorOrderResponseDto> {
    return this.orderService.cancelVendorOrder(user.id, orderId);
  }

  @Patch('vendor/:orderId/accept')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Order accepted successfully.')
  async acceptVendorOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<VendorOrderActionResponseDto> {
    return this.orderService.acceptVendorOrder(user.id, orderId);
  }

  @Patch('vendor/:orderId/ready-for-pickup')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Order marked as ready for pickup.')
  async markVendorOrderReadyForPickup(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<VendorOrderActionResponseDto> {
    return this.orderService.markVendorOrderReadyForPickup(user.id, orderId);
  }

  @Patch('vendor/:orderId/complete')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ResponseMessage('Order completed successfully.')
  async completeVendorOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<VendorOrderActionResponseDto> {
    return this.orderService.completeVendorOrder(user.id, orderId);
  }  

  @Post('vendor/:orderId/report')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ResponseMessage('Order reported successfully.')
  async createVendorOrderReport(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderReportDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CreateOrderReportResponseDto> {
    return this.orderService.createVendorOrderReport(
      user.id,
      orderId,
      dto,
      files,
    );
  }

  @Get('vendor/:orderId/report')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  async getVendorOrderReport(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<VendorOrderReportResponseDto> {
    return this.orderService.getVendorOrderReport(user.id, orderId);
  }
} 