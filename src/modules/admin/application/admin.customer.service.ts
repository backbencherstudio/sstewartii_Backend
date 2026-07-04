import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { VerificationStatus } from '@prisma/client';

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
  CustomerVendorReportsResponseDto,
  CustomerVendorReportsResponseDto2,
} from '../presentation/dto/customer-detail.response.dto';

import { CustomerService } from '@/modules/customer/customer/application/customer.service';

@Injectable()
export class AdminCustomerService {
  constructor(
    @Inject('IAdminCustomerRepository')
    private readonly adminCustomerRepository: IAdminCustomerRepository,
    private readonly adminCustomerMapper: AdminCustomerMapper,
    private readonly customerService: CustomerService,
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

    const raw = await this.adminCustomerRepository.findRawCustomerData(
      customerId,
      query,
    );
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

    return this.adminCustomerMapper.toReportDetail(raw);
  }

  async getCustomerVendorReports(
    customerId: string,
  ): Promise<CustomerVendorReportsResponseDto> {
    const raw =
      await this.adminCustomerRepository.findCustomerVendorReports(customerId);

    if (!raw) {
      throw new NotFoundException('Customer not found');
    }

    if (!raw.vendorGroups.length) {
      throw new NotFoundException('No reports found for this customer');
    }

    return this.adminCustomerMapper.toCustomerVendorReports(raw);
  }

  async getCustomerVendorReports2(
    customerId: string,
  ): Promise<CustomerVendorReportsResponseDto2> {
    const raw =
      await this.adminCustomerRepository.findCustomerVendorReports2(customerId);

    if (!raw) {
      throw new NotFoundException('Customer not found');
    }

    if (!raw.vendorGroups.length) {
      throw new NotFoundException('No reports found for this customer');
    }

    return this.adminCustomerMapper.toCustomerVendorReports1(raw);
  }

  async deactivateCustomer(customerId: string): Promise<void> {
    const exists =
      await this.customerService.findActiveByCustomerId(customerId);
    if (!exists) {
      throw new NotFoundException('Customer not found');
    }

    const customer =
      await this.adminCustomerRepository.findActiveStatus(customerId);

    if (!customer.isActive) {
      throw new BadRequestException('Customer is already deactivated');
    }

    await this.adminCustomerRepository.deactivateCustomer(customerId);
  }
}
