import { Module } from '@nestjs/common';
import { CartController } from './presentation/controllers/cart.controller';
import { CartService } from './application/cart.service';
import { CartRepository } from './infrastructure/repositories/cart.repository';
import { CustomerModule } from '../customer/customer.module';
import { ProductModule } from '@/modules/product/product.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { MediaModule } from '@/common/media/media.module';
import { CartMapper } from './infrastructure/mapper/cart.mapper';

@Module({
  imports: [
    CustomerModule, 
    ProductModule,
    PrismaModule,
    MediaModule
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartMapper,
    {
      provide: 'ICartRepository',
      useClass: CartRepository,
    },
  ],
  exports: [CartService],
})
export class CartModule {}