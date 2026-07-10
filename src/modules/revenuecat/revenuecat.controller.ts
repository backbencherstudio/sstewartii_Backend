import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RevenueCatService } from './revenuecat.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
  path: 'webhooks/revenuecat',
  version: '1',
})
export class RevenueCatWebhookController {
  private readonly logger = new Logger(RevenueCatWebhookController.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly revenueCatService: RevenueCatService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'REVENUECAT_WEBHOOK_SECRET',
    );
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('authorization') authHeader: string,
  ) {
    this.logger.debug(`Event type: ${payload?.event?.type}`);

    if (!payload || Object.keys(payload).length === 0) {
      this.logger.error('Empty payload received');
      throw new ForbiddenException('Empty payload');
    }

    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv === 'production') {
      if (!this.webhookSecret) {
        this.logger.error('Webhook secret not configured!');
        throw new ForbiddenException('Webhook secret not configured');
      }
      this.verifyWebhookAuth(authHeader);
    } else {
      this.logger.log('Development mode - skipping auth verification');
    }

    const result = await this.revenueCatService.processWebhookEvent(payload);
    this.logger.log(`Webhook processed: ${payload?.event?.type ?? 'unknown'}`);

    return {
      received: true,
      event: payload?.event?.type,
      processed: result,
    };
  }

  private verifyWebhookAuth(authHeader: string): void {
    if (!authHeader) {
      this.logger.error('Missing Authorization header');
      throw new ForbiddenException('Missing Authorization header');
    }

    const provided = authHeader.replace(/^Bearer\s+/i, '');
    const expected = (this.webhookSecret as string).replace(/^Bearer\s+/i, '');

    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);

    const isValid =
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(providedBuf, expectedBuf);

    if (!isValid) {
      this.logger.error('Invalid webhook Authorization header');
      throw new ForbiddenException('Invalid Authorization header');
    }

    this.logger.log('Webhook auth verified');
  }
}
