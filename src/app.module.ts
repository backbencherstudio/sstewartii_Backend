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
    AuthModule,
    VendorProfileSetupModule,
    StorageModule,
    VendorVerificationModule,
    VendorModule,
    ProductModule,
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
