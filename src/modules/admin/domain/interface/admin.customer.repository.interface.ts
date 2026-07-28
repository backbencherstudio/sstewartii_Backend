import { Prisma } from '@prisma/client';

import {
  CustomerOrderHistoryQueryDto,
  CustomerReportQueueQueryDto,
} from '../../presentation/dto/customer-query.dto';
import {
  CustomerRawData,
  ReportQueueRawData,
  CustomerVendorReportsRawData,
  CustomerVendorReportsRawData1,
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

// Main Interface
export interface IAdminCustomerRepository {
  findAll(params: FindAllCustomersParams): Promise<{
    data: {
      customers: any[];
      total: number;
      stats: {
        totalCustomers: number;
        activeUsers: number;
        reportedCustomers: number;
        suspendedCustomers: number;
        lastUpdated: Date;
      };
    };
  }>;

  findRawCustomerData(
    customerId: string,
    query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerRawData>;

  existsById(customerId: string): Promise<boolean>;

  findRawCustomerData(
    customerId: string,
    query: CustomerOrderHistoryQueryDto,
  ): Promise<CustomerRawData>;

  findReportQueue(
    query: CustomerReportQueueQueryDto,
  ): Promise<ReportQueueRawData>;

  findReportDetail(customerId: string);

  findCustomerVendorReports(
    customerId: string,
  ): Promise<CustomerVendorReportsRawData | null>;

  findCustomerVendorReports2(
    customerId: string,
    vendorId: string,
  ): Promise<CustomerVendorReportsRawData1 | null>;

  findActiveStatus(customerId: string): Promise<{ isActive: boolean }>;

  deactivateCustomer(customerId: string): Promise<void>;
}
