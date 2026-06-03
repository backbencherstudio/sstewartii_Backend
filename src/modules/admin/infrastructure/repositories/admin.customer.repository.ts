import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { 
  Customer,
 } from '@prisma/client';

import type {
 IAdminCustomerRepository,
 FindAllCustomersParams
} from '../../domain/interface/admin.customer.repository.interface';

import { 
  VendorVerificationSort,
 } from '../../presentation/dto/admin.dto';

@Injectable()
export class AdminCustomerRepository
  implements IAdminCustomerRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: FindAllCustomersParams) {
    const { where, page, limit, orderBy } = params;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          orders: {
            select: {
              totalAmount: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total };
  }
}