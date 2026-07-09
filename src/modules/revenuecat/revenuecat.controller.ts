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

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('authorization') authHeader: string,
    @Headers('x-revenuecat-signature') signature: string,
  ) {
    // Log incoming webhook
    this.logger.log('📨 Received RevenueCat webhook');
    this.logger.debug(`Webhook headers:`, { authHeader, signature });
    this.logger.debug(`Webhook payload:`, JSON.stringify(payload, null, 2));

    // Verify webhook signature in production
    if (this.configService.get('NODE_ENV') === 'production') {
      if (!this.webhookSecret) {
        this.logger.error('Webhook secret not configured!');
        throw new ForbiddenException('Webhook secret not configured');
      }
      this.verifyWebhookSignature(payload, signature);
    }

    // Process the webhook event
    const result = await this.revenueCatService.processWebhookEvent(payload);

    this.logger.log(
      `✅ Webhook processed successfully: ${payload.event?.type || 'unknown'}`,
    );

    return {
      received: true,
      event: payload.event?.type,
      processed: result,
    };
  }

  private verifyWebhookSignature(
    payload: any,
    signature: string,
  ): void {
    if (!signature) {
      this.logger.error('Missing webhook signature');
      throw new ForbiddenException('Missing signature');
    }

    try {
      // RevenueCat uses HMAC-SHA256 for webhook verification
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret as string)
        .update(payloadString)
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.error('Invalid webhook signature');
        throw new ForbiddenException('Invalid signature');
      }

      this.logger.log('✅ Webhook signature verified successfully');
    } catch (error: any) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      throw new ForbiddenException('Signature verification failed');
    }
  }
}
