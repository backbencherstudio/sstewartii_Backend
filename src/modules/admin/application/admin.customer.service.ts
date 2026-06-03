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

import {
  GetCustomersQueryDto,
 } from '../presentation/dto/admin.dto';
import { 
  PaginatedCustomerResponseDto,
 } from '../presentation/dto/admin.response.dto';

import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';


@Injectable()
export class AdminCustomerService {
  constructor(
    @Inject('IAdminVendorVerificationRepository')
    private readonly adminCustomerRepository: IAdminCustomerRepository,
    private readonly adminCustomerMapper: AdminCustomerMapper,
    private readonly vendorService: VendorService,
  ) {}

async getCustomers(params: FindAllCustomersParams) {
  const result = await this.adminCustomerRepository.findAll(params);

  return this.adminCustomerMapper.toPaginated(result);
}
}


