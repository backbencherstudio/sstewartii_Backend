import { 
  VerificationStatus,
  Customer,
  Prisma,
 } from '@prisma/client';

import { 
  VendorVerificationSort,
 } from '../../presentation/dto/admin.dto';
 import { 
  CustomerOrderHistoryQueryDto,
  CustomerReportQueueQueryDto,
 } from '../../presentation/dto/customer-query.dto';
 import { 
  CustomerRawData,
  ReportQueueRawData,
  CustomerReportDetailRawData,
 } from '../../infrastructure/mapper/admin.customer.mapper';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface FindAllCustomersParams {
  where?: Prisma.CustomerWhereInput;
  page: number;
  limit: number;
  orderBy?: Prisma.CustomerOrderByWithRelationInput;
}

//Main Interface
export interface IAdminCustomerRepository {
  findAll(
    params: FindAllCustomersParams
  ): Promise<PaginatedResult<any>>; 

  findRawCustomerData(
    customerId: string,
    query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerRawData>;

  existsById(customerId: string): Promise<boolean> 

  findRawCustomerData(
    customerId: string,
    query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerRawData>;

  findReportQueue(
    query: CustomerReportQueueQueryDto,
  ): Promise<ReportQueueRawData>;

  findReportDetail(
    customerId: string,
  ): Promise<CustomerReportDetailRawData | null>;
}