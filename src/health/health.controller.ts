import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { Controller, Get } from '@nestjs/common';
import Redis from 'ioredis';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: Redis,
  ) {}

  @Get()
  async check() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
      },
    };

    const isHealthy =
      health.services.database === 'connected' &&
      health.services.redis === 'connected';

    return {
      ...health,
      status: isHealthy ? 'healthy' : 'unhealthy',
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      await this.redis.ping();
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }
}
