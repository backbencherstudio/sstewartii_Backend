import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationController } from './presentation/controllers/notification.controller';
import { NotificationService } from './application/notification.service';
import { NotificationRepository } from './infrastructure/repositories/notification.repository';
import { NotificationGateway } from './infrastructure/gateways/notification.gateway';
import { FirebaseService } from '@/common/firebase/firebase.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationHelperService } from '@/common/shared/notification.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        } as any,
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [
    PrismaService,
    FirebaseService,
    NotificationRepository,
    {
      provide: 'INotificationRepository',
      useClass: NotificationRepository,
    },
    NotificationService,
    NotificationGateway,
    NotificationHelperService,
  ],
  exports: [
    NotificationService,
    NotificationGateway,
    NotificationHelperService,
  ],
})
export class NotificationModule {}
