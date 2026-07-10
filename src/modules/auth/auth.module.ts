import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/auth.service';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoggerMiddleware } from 'src/common/middleware/logger.middleware';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { OtpRepository } from './infrastructure/repositories/otp.repository';
import { MailService } from 'src/common/mail/mail.service';
import { AuthOtpQueueService } from './infrastructure/queues/auth-otp-queue.service';
import { AuthOtpProcessor } from './infrastructure/queues/auth-otp.processor';
import { BullModule } from '@nestjs/bullmq';
import { AUTH_QUEUE } from '@/common/queues/queue.constants';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountDeletionTask } from './infrastructure/tasks/account-deletion.task';
import { RevenueCatModule } from '../revenuecat/revenuecat.module';
import { VendorModule } from '../vendor/vendor/vendor.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h') as any,
        },
      }),
    }),

    RevenueCatModule,
    VendorModule,

    BullModule.registerQueue({
      name: AUTH_QUEUE,
    }),

    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    MailService,
    AuthOtpQueueService,
    AuthOtpProcessor,
    AccountDeletionTask,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IOtpRepository',
      useClass: OtpRepository,
    },
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      //.exclude('health')
      .forRoutes(AuthController);
  }
}
