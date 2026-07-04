import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/infrastructure/guards/jwt-auth.guard';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VendorProfileSetupModule } from './modules/vendor/profile-setup-flow/profile.setup.module';
import { StorageModule } from './common/storage/storage.module';
import { VendorVerificationModule } from './modules/vendor/vendor-verification/vendor.verification.module';
import { VendorModule } from './modules/vendor/vendor/vendor.module';
import { ProductModule } from './modules/product/product.module';
import { CustomerModule } from './modules/customer/customer/customer.module';
import { CartModule } from './modules/customer/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { ReviewModule } from './modules/review/review.module';
import { MediaModule } from './common/media/media.module';
import { HelpCenterModule } from './modules/help-center/help-center.module';
import { BullModule } from '@nestjs/bullmq';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 1000,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
        },
      },
    }),

    AuthModule,
    VendorProfileSetupModule,
    StorageModule,
    VendorVerificationModule,
    VendorModule,
    ProductModule,
    CustomerModule,
    CartModule,
    OrderModule,
    ReviewModule,
    MediaModule,
    HelpCenterModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
