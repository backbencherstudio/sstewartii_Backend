import { 
  Inject, 
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
 } from '@nestjs/common';

import {
  VerificationStatus,
  OrderStatus,
  VendorAdminStatus,
} from '@prisma/client';

import type { 
  IAdminCustomerRepository,
  FindAllCustomersParams,
 } from '../domain/interface/admin.customer.repository.interface';

import { AdminCustomerMapper } from '../infrastructure/mapper/admin.customer.mapper';

import { CustomerOrderHistoryQueryDto } from '../presentation/dto/customer-query.dto';
import {
  GetCustomersQueryDto,
 } from '../presentation/dto/admin.dto';
import { 
  PaginatedCustomerResponseDto,
 } from '../presentation/dto/admin.response.dto';
import { CustomerDetailResponseDto } from '../presentation/dto/customer-detail.response.dto';

import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';

@Injectable()
export class AdminCustomerService {
  constructor(
    @Inject('IAdminCustomerRepository')
    private readonly adminCustomerRepository: IAdminCustomerRepository,
    private readonly adminCustomerMapper: AdminCustomerMapper,
    private readonly vendorService: VendorService,
  ) {}

  async getCustomers(params: FindAllCustomersParams) {
    const result = await this.adminCustomerRepository.findAll(params);

    return this.adminCustomerMapper.toPaginated(result);
  }

  async getCustomerDetail(
    customerId: string,
    query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerDetailResponseDto> {

    const exists = await this.adminCustomerRepository.existsById(customerId);
    if (!exists) {
      throw new NotFoundException('Customer not found');
    }

    const raw = await this.adminCustomerRepository.findRawCustomerData(customerId, query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    return this.adminCustomerMapper.toDetailResponse(raw, page, limit);
  }
}


