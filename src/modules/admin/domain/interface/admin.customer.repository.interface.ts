import { 
  VerificationStatus,
  Customer,
  Prisma,
 } from '@prisma/client';

import { 
  VendorVerificationSort,
 } from '../../presentation/dto/admin.dto';

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
}