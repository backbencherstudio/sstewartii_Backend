import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { CustomerService } from '../../application/customer.service';
import { SetCustomerLocationDto } from '../dto/customer.dto';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { CustomerResponseDto } from '../dto/customer.response.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { HomeResponseDto } from '../dto/home.response.dto';
import { HomeService } from '../../application/home.service';

@Controller('customer')
export class CustomerController {
  constructor(
    private readonly service: CustomerService,
    private readonly homeService: HomeService,
  ) {}

  @Post('set-location')
  @UseGuards(RoleGuard)
  @Roles(Role.USER) 
  @ResponseMessage('Set Location Successfull.')
  async setLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetCustomerLocationDto,
  ): Promise<CustomerResponseDto> {
    return this.service.setLocation(user.id, dto);
  }

  @Get('home')
  @UseGuards(RoleGuard)
  @Roles(Role.USER) 
  async getHome(
    @CurrentUser() user: AuthUser,
  ): Promise<HomeResponseDto> {
    return this.homeService.getHome(user.id);
  }

}