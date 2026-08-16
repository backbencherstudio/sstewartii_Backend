import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import Redis from 'ioredis';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [
    {
      provide: Redis,

      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
})
export class HealthModule {}