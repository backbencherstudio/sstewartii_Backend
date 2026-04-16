import { Module } from '@nestjs/common';
import { CustomerService } from './application/customer.service';
import { CustomerController } from './presentation/controllers/customer.controller';
import { CustomerRepository } from './infrastructure/repositories/customer.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { HomeService } from './application/home.service';
import { HomeRepository } from './infrastructure/repositories/home.repository';

@Module({
  controllers: [CustomerController],
  providers: [
    CustomerService,
    PrismaService,
    HomeService,
    {
      provide: 'ICustomerRepository',
      useClass: CustomerRepository,
    },
    {
      provide: 'IHomeRepository',
      useClass: HomeRepository,
    },
  ],
  exports: ['ICustomerRepository', CustomerService],
})
export class CustomerModule {}