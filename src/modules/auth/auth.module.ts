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
import { MailService } from './infrastructure/services/mail.service';

@Module({
  imports:[
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
  ],
  controllers:[AuthController],
  providers:[
    AuthService,
    PrismaService,
    MailService,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IOtpRepository',
      useClass: OtpRepository,
    },
    JwtStrategy,
    GoogleStrategy
  ],
  exports: [
    JwtModule,
    PassportModule,
  ],
})

export class AuthModule implements NestModule {

   configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(LoggerMiddleware)
  //.exclude('health')
    .forRoutes(AuthController);
  }
}