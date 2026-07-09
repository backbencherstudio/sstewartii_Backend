import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  async processWebhookEvent(
    payload: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const eventType = payload.event?.type || payload.type;
      const appUserId = payload.event?.app_user_id || payload.app_user_id;

      this.logger.log(
        `🔄 Processing RevenueCat event: ${eventType} for user: ${appUserId}`,
      );

      // Log full event details
      this.logger.debug(`Event details: ${JSON.stringify(payload, null, 2)}`);

      // Handle different event types
      let result;
      switch (eventType) {
        case 'INITIAL_PURCHASE':
          result = await this.handleInitialPurchase(payload);
          break;
        case 'RENEWAL':
          result = await this.handleRenewal(payload);
          break;
        case 'CANCELLATION':
          result = await this.handleCancellation(payload);
          break;
        case 'EXPIRATION':
          result = await this.handleExpiration(payload);
          break;
        case 'NON_RENEWING_PURCHASE':
          result = await this.handleNonRenewingPurchase(payload);
          break;
        case 'PRODUCT_CHANGE':
          result = await this.handleProductChange(payload);
          break;
        case 'REFUND':
          result = await this.handleRefund(payload);
          break;
        case 'UNCANCELLATION':
          result = this.handleUncancellation(payload);
          break;
        default:
          this.logger.warn(`⚠️  Unhandled event type: ${eventType}`);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          result = {
            success: true,
            message: `Event ${eventType} logged but not processed`,
          };
      }

      this.logger.log(`✅ Event ${eventType} processed successfully`);
      return { success: true, message: `Event ${eventType} processed` };
    } catch (error: any) {
      this.logger.error(`❌ Error processing webhook: ${error.message}`);
      this.logger.error(error.stack);
      return { success: false, message: error.message };
    }
  }

  private handleInitialPurchase(payload: any): any {
    const { event } = payload;
    this.logger.log(`🎉 New subscription purchase!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(`   Transaction: ${event.transaction_id}`);
    this.logger.log(`   Store: ${event.store}`);

    // Add your business logic here:
    // - Grant user premium access
    // - Create subscription record in database
    // - Send welcome email
    // - Track analytics

    return { success: true };
  }

  private handleRenewal(payload: any): any {
    const { event } = payload;
    this.logger.log(`🔄 Subscription renewal!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(`   Renewal period: ${event.period_type}`);
    this.logger.log(`   Expires at: ${event.expiration_at_ms}`);

    // Add your business logic here:
    // - Extend user subscription
    // - Update database records
    // - Send renewal confirmation

    return { success: true };
  }

  private handleCancellation(payload: any): any {
    const { event } = payload;
    this.logger.log(`❌ Subscription cancelled!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(`   Cancel reason: ${event.cancel_reason || 'Unknown'}`);

    // Add your business logic here:
    // - Update subscription status
    // - Send cancellation email
    // - Schedule downgrade

    return { success: true };
  }

  private handleExpiration(payload: any): any {
    const { event } = payload;
    this.logger.log(`⏰ Subscription expired!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(
      `   Expired at: ${new Date(parseInt(event.expiration_at_ms)).toISOString()}`,
    );

    // Add your business logic here:
    // - Revoke premium access
    // - Update database
    // - Send expiration notification

    return { success: true };
  }

  private handleNonRenewingPurchase(payload: any): any {
    const { event } = payload;
    this.logger.log(`🛍️ One-time purchase!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(`   Transaction: ${event.transaction_id}`);

    // Add your business logic here:
    // - Grant one-time access/credits
    // - Update user balance
    // - Send purchase confirmation

    return { success: true };
  }

  private handleProductChange(payload: any): any {
    const { event } = payload;
    this.logger.log(`🔄 Product change!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   New product: ${event.new_product_id}`);
    this.logger.log(`   Old product: ${event.old_product_id}`);

    // Add your business logic here:
    // - Update subscription tier
    // - Adjust billing accordingly

    return { success: true };
  }

  private handleRefund(payload: any): any {
    const { event } = payload;
    this.logger.log(`💰 Refund issued!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Transaction: ${event.transaction_id}`);
    this.logger.log(`   Amount: ${event.amount}`);

    // Add your business logic here:
    // - Revoke access
    // - Update financial records

    return { success: true };
  }

  private handleUncancellation(payload: any) {
    const { event } = payload;
    this.logger.log(`↩️ Subscription uncancelled!`);
    this.logger.log(`   User: ${event.app_user_id}`);
    this.logger.log(`   Product: ${event.product_id}`);

    // Add your business logic here:
    // - Reactivate subscription
    // - Update status

    return { success: true };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    console.log({ payload, signature });
    // This method is now implemented in the controller
    // Keeping for backward compatibility
    return true;
  }
}
