import { 
  Inject, 
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
 } from '@nestjs/common';

import {
  VerificationStatus,
} from '@prisma/client';

import type { 
  IAdminCustomerRepository,
  FindAllCustomersParams,
 } from '../domain/interface/admin.customer.repository.interface';

import { AdminCustomerMapper } from '../infrastructure/mapper/admin.customer.mapper';

import { 
  CustomerOrderHistoryQueryDto,
  CustomerReportQueueQueryDto,
} from '../presentation/dto/customer-query.dto';
import { 
  CustomerDetailResponseDto,
  CustomerReportQueueResponseDto,
  CustomerReportDetailResponseDto,
 } from '../presentation/dto/customer-detail.response.dto';

import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';

@Injectable()
export class AdminCustomerService {
  constructor(
    @Inject('IAdminCustomerRepository')
    private readonly adminCustomerRepository: IAdminCustomerRepository,
    private readonly adminCustomerMapper: AdminCustomerMapper,
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

  async getReportQueue(
    query: CustomerReportQueueQueryDto,
  ): Promise<CustomerReportQueueResponseDto> {

    const raw = await this.adminCustomerRepository.findReportQueue(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    return this.adminCustomerMapper.toReportQueueResponse(raw, page, limit);
  }

  async getCustomerReportDetail(
    customerId: string,
  ): Promise<CustomerReportDetailResponseDto> {

    const raw = await this.adminCustomerRepository.findReportDetail(customerId);

    if (!raw) {
      throw new NotFoundException('Customer not found');
    }

    if (raw.totalReportCount === 0) {
      throw new NotFoundException('No reports found for this customer');
    }
    
    return AdminCustomerMapper.toReportDetail(raw);
  }
}