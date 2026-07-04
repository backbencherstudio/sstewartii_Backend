import { Module } from '@nestjs/common';

import { OrderController } from './presentation/controllers/order.controller';
import { OrderService } from './application/order.service';
import { OrderRepository } from './infrastructure/repositories/order.repository';
import { CustomerModule } from '../customer/customer/customer.module';
import { CartModule } from '../customer/cart/cart.module';
import { PrismaService } from '@/prisma/prisma.service';
import { VendorModule } from '../vendor/vendor/vendor.module';
import { OrderMapper } from './infrastructure/mapper/order.mapper';
import { MediaModule } from '@/common/media/media.module';
import { StorageModule } from '@/common/storage/storage.module';

@Module({
  imports: [
    CustomerModule,
    CartModule,
    VendorModule,
    MediaModule,
    StorageModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    PrismaService,
    OrderMapper,
    {
      provide: 'IOrderRepository',
      useClass: OrderRepository,
    },
  ],
})
export class OrderModule {}
