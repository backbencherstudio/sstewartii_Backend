/* eslint-disable @typescript-eslint/no-unused-vars */
// src/modules/revenuecat/revenuecat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WebhookStatus,
  PeriodType,
  SubscriptionTransactionStatus,
  SubscriptionStatus,
  SubscriptionProvider,
  SubscriptionStore,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);
  private readonly revenueCatApiKey: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.revenueCatApiKey =
      this.configService.get<string>('REVENUECAT_API_KEY') || '';
    this.webhookSecret =
      this.configService.get<string>('REVENUECAT_WEBHOOK_SECRET') || '';

    if (!this.revenueCatApiKey) {
      this.logger.warn(
        '⚠️ REVENUECAT_API_KEY is not set in environment variables',
      );
    }
    if (!this.webhookSecret) {
      this.logger.warn(
        '⚠️ REVENUECAT_WEBHOOK_SECRET is not set in environment variables',
      );
    }
  }

  /**
   * Register a vendor with RevenueCat
   * This should be called when a vendor registers or logs in
   */
  async registerVendorWithRevenueCat(
    vendorId: string,
    userId: string,
    platform: 'ios' | 'android' = 'ios',
  ): Promise<void> {
    try {
      this.logger.log(`📝 Registering vendor ${vendorId} with RevenueCat...`);

      // Check if vendor already has a RevenueCat user ID stored
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          vendorSubscription: {
            select: {
              id: true,
              revenueCatAppUserId: true,
            },
          },
        },
      });

      // If vendor already has a RevenueCat ID, skip
      if (existingVendor?.vendorSubscription?.revenueCatAppUserId) {
        this.logger.log(
          `✅ Vendor ${vendorId} already has RevenueCat ID: ${existingVendor.vendorSubscription.revenueCatAppUserId}`,
        );
        return;
      }

      // Use the user ID as the RevenueCat app user ID
      const revenueCatUserId = userId;

      // Store ONLY the RevenueCat user ID mapping, not a subscription
      await this.prisma.vendorSubscription.upsert({
        where: { vendorId },
        update: {
          revenueCatAppUserId: revenueCatUserId,
          provider: SubscriptionProvider.REVENUECAT,
        },
        create: {
          vendorId,
          revenueCatAppUserId: revenueCatUserId,
          provider: SubscriptionProvider.REVENUECAT,
          status: SubscriptionStatus.INACTIVE,
          productId: 'pending',
          store: SubscriptionStore.UNKNOWN,
          isActive: false,
          autoRenew: false,
        },
      });

      this.logger.log(
        `✅ Vendor ${vendorId} registered with RevenueCat (ID: ${revenueCatUserId})`,
      );

      // Call RevenueCat API to set the app user ID
      await this.setRevenueCatAppUserId(revenueCatUserId, vendorId, platform);
    } catch (error: any) {
      this.logger.error(
        `Error registering vendor with RevenueCat: ${error.message}`,
      );
      // Don't throw - registration should not block the main flow
    }
  }

  /**
   * Call RevenueCat API to set the app user ID
   */
  private async setRevenueCatAppUserId(
    appUserId: string,
    vendorId: string,
    platform: 'ios' | 'android' = 'ios',
  ): Promise<void> {
    try {
      if (!this.revenueCatApiKey) {
        this.logger.warn(
          'RevenueCat API key not configured, skipping API call',
        );
        return;
      }

      this.logger.log(
        `📡 Calling RevenueCat API to set attributes for user: ${appUserId}`,
      );

      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${appUserId}/attributes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.revenueCatApiKey}`,
            'Content-Type': 'application/json',
            'X-Platform': platform,
          },
          body: JSON.stringify({
            attributes: {
              vendorId: {
                value: vendorId,
              },
              platform: {
                value: platform,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.warn(
          `RevenueCat API warning: ${response.status} — ${errorBody}`,
        );
        return;
      }

      this.logger.log(
        `✅ RevenueCat app user ID set: ${appUserId} for vendor: ${vendorId} (platform: ${platform})`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Could not set RevenueCat app user ID: ${error.message}`,
      );
      // Non-critical — don't throw, just log
    }
  }

  // ============================================
  // MAIN WEBHOOK PROCESSING
  // ============================================

  async processWebhookEvent(
    payload: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const event = payload.event;
      const eventType = event?.type || payload.type;
      const appUserId = event?.app_user_id || payload.app_user_id;

      this.logger.log(
        `🔄 Processing RevenueCat event: ${eventType} for user: ${appUserId}`,
      );

      // Find vendor by RevenueCat app user ID
      const vendor = await this.findVendorByRevenueCatId(appUserId, payload);

      if (!vendor) {
        this.logger.error(
          `❌ Vendor not found for RevenueCat user: ${appUserId}`,
        );
        await this.logWebhook(payload, 'unknown', false);
        return {
          success: false,
          message: `Vendor not found for RevenueCat user: ${appUserId}`,
        };
      }

      // Log the webhook
      await this.logWebhook(payload, vendor.id);

      // Handle different event types
      let result;
      switch (eventType) {
        case 'INITIAL_PURCHASE':
          result = await this.handleInitialPurchase(vendor, payload);
          break;
        case 'RENEWAL':
          result = await this.handleRenewal(vendor, payload);
          break;
        case 'CANCELLATION':
          result = await this.handleCancellation(vendor, payload);
          break;
        case 'EXPIRATION':
          result = await this.handleExpiration(vendor, payload);
          break;
        case 'NON_RENEWING_PURCHASE':
          result = await this.handleNonRenewingPurchase(vendor, payload);
          break;
        case 'PRODUCT_CHANGE':
          result = await this.handleProductChange(vendor, payload);
          break;
        case 'REFUND':
          result = await this.handleRefund(vendor, payload);
          break;
        case 'UNCANCELLATION':
          result = await this.handleUncancellation(vendor, payload);
          break;
        case 'TEST':
          result = await this.handleTestEvent(vendor, payload);
          break;
        default:
          this.logger.warn(`⚠️ Unhandled event type: ${eventType}`);
          result = {
            success: true,
            message: `Event ${eventType} logged but not processed`,
          };
      }

      // Update webhook log status
      await this.updateWebhookLog(
        payload,
        result.success ? WebhookStatus.SUCCESS : WebhookStatus.FAILED,
      );

      this.logger.log(
        `✅ Event ${eventType} processed successfully for vendor: ${vendor.id}`,
      );
      return { success: true, message: `Event ${eventType} processed` };
    } catch (error: any) {
      this.logger.error(`❌ Error processing webhook: ${error.message}`);
      this.logger.error(error.stack);
      return { success: false, message: error.message };
    }
  }

  // ============================================
  // FIND VENDOR BY REVENUECAT ID
  // ============================================

  private async findVendorByRevenueCatId(
    appUserId: string,
    payload?: any,
  ): Promise<any> {
    if (!appUserId) return null;

    // Check for original_app_user_id first
    const originalAppUserId =
      payload?.event?.original_app_user_id || payload?.original_app_user_id;

    if (originalAppUserId && originalAppUserId !== appUserId) {
      this.logger.log(`🔍 Checking original_app_user_id: ${originalAppUserId}`);

      const vendorByOriginal = await this.prisma.vendor.findFirst({
        where: {
          OR: [
            {
              vendorSubscription: {
                revenueCatAppUserId: originalAppUserId,
              },
            },
            {
              ownerId: originalAppUserId,
            },
          ],
        },
        include: {
          vendorSubscription: true,
        },
      });

      if (vendorByOriginal) {
        this.logger.log(
          `✅ Found vendor by original_app_user_id: ${vendorByOriginal.id}`,
        );
        return vendorByOriginal;
      }
    }

    // Try to find vendor by RevenueCat app user ID stored in subscription
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        vendorSubscription: {
          revenueCatAppUserId: appUserId,
        },
      },
      include: {
        vendorSubscription: true,
      },
    });

    if (vendor) {
      return vendor;
    }

    // Try to find by owner ID
    const userVendor = await this.prisma.vendor.findFirst({
      where: {
        ownerId: appUserId,
      },
      include: {
        vendorSubscription: true,
      },
    });

    if (userVendor) {
      return userVendor;
    }

    // For development, try to find by email
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      const email = payload?.event?.subscriber_attributes?.$email?.value;
      if (email) {
        const vendorByEmail = await this.prisma.vendor.findFirst({
          where: {
            OR: [
              { publicEmail: email },
              {
                owner: {
                  email: email,
                },
              },
            ],
          },
          include: {
            vendorSubscription: true,
          },
        });

        if (vendorByEmail) {
          this.logger.log(`✅ Found vendor by email: ${vendorByEmail.id}`);
          return vendorByEmail;
        }
      }

      // Fallback: find any vendor for testing
      const anyVendor = await this.prisma.vendor.findFirst({
        include: {
          vendorSubscription: true,
        },
      });

      if (anyVendor) {
        this.logger.log(
          `⚠️ Using fallback vendor for testing: ${anyVendor.id}`,
        );
        return anyVendor;
      }
    }

    return null;
  }

  // ============================================
  // FIND SUBSCRIPTION PLAN
  // ============================================

  private async findSubscriptionPlanByProductId(productId: string) {
    if (!productId) return null;

    // Try to find by various product identifiers
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { code: productId },
          { appleProductId: productId },
          { googleProductId: productId },
          { stripePriceId: productId },
          { revenueCatEntitlementId: productId },
        ],
      },
    });

    if (plan) {
      this.logger.log(`✅ Found plan: ${plan.name} (${plan.code})`);
      return plan;
    }

    // Try to find by name mapping
    const planName = this.getPlanNameFromProductId(productId);
    if (planName) {
      const planByName = await this.prisma.subscriptionPlan.findFirst({
        where: { name: planName },
      });
      if (planByName) {
        this.logger.log(`✅ Found plan by name mapping: ${planName}`);
        return planByName;
      }
    }

    // For development, create a temporary plan
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      this.logger.warn(
        `⚠️ Plan not found for product: ${productId}, creating temporary plan`,
      );
      return await this.createTemporaryPlan(productId);
    }

    this.logger.warn(`⚠️ No plan found for product: ${productId}`);
    return null;
  }

  private getPlanNameFromProductId(productId: string): string | null {
    const planMap: Record<string, string> = {
      atliss_app_starter: 'Starter Plan',
      atliss_app_pro: 'Pro Plan',
      atliss_app_elite: 'Elite Plan',
      atliss_app_premium: 'Premium Plan',
      atliss_app_free_trial: 'Free Trial',
      atliss_app_basic: 'Basic Plan',
      atliss_app_standard: 'Standard Plan',
      atliss_app_plus: 'Plus Plan',
    };
    return planMap[productId] || null;
  }

  private async createTemporaryPlan(productId: string) {
    const planName = this.getPlanNameFromProductId(productId) || 'Unknown Plan';
    const code = productId.toUpperCase().replace(/-/g, '_');

    return this.prisma.subscriptionPlan.create({
      data: {
        name: planName,
        code: code,
        durationDays: 30,
        maxProducts: 10,
        price: 0,
        currency: 'USD',
        appleProductId: productId,
        googleProductId: productId,
        stripePriceId: productId,
        revenueCatEntitlementId: productId,
        isActive: true,
      },
    });
  }

  // ============================================
  // WEBHOOK LOGGING
  // ============================================

  private async logWebhook(
    payload: any,
    vendorId: string,
    isError: boolean = false,
  ): Promise<void> {
    try {
      const event = payload.event || payload;
      await this.prisma.revenueCatWebhookLog.create({
        data: {
          eventId: event?.id,
          eventType: event?.type || 'UNKNOWN',
          vendorId: vendorId,
          productId: event?.product_id,
          store: event?.store,
          environment: event?.environment,
          rawPayload: payload,
          status: isError ? WebhookStatus.FAILED : WebhookStatus.RECEIVED,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to log webhook: ${error.message}`);
    }
  }

  private async updateWebhookLog(
    payload: any,
    status: WebhookStatus,
  ): Promise<void> {
    try {
      const event = payload.event || payload;
      await this.prisma.revenueCatWebhookLog.updateMany({
        where: { eventId: event?.id || undefined },
        data: { status },
      });
    } catch (error: any) {
      this.logger.error(`Failed to update webhook log: ${error.message}`);
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private async handleInitialPurchase(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`🎉 New subscription purchase for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(`   Store: ${event.store}`);

    try {
      const subscriptionPlan = await this.findSubscriptionPlanByProductId(
        event.product_id,
      );

      const subscription = await this.prisma.vendorSubscription.upsert({
        where: { vendorId: vendor.id },
        update: {
          revenueCatAppUserId: event.app_user_id,
          entitlementId: event.entitlement_id,
          productId: event.product_id,
          subscriptionPlanId: subscriptionPlan?.id || null,
          store: event.store || SubscriptionStore.UNKNOWN,
          status: SubscriptionStatus.ACTIVE,
          provider: SubscriptionProvider.REVENUECAT,
          currentPeriodStart: new Date(parseInt(event.purchased_at_ms)),
          currentPeriodEnd: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          expiresAt: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          lastRenewalDate: new Date(parseInt(event.purchased_at_ms)),
          isTrialPeriod: event.period_type === 'TRIAL',
          isActive: true,
          autoRenew: true,
          rawProviderData: event,
          cancellationDate: null,
        },
        create: {
          vendorId: vendor.id,
          revenueCatAppUserId: event.app_user_id,
          entitlementId: event.entitlement_id,
          productId: event.product_id,
          subscriptionPlanId: subscriptionPlan?.id || null,
          store: event.store || SubscriptionStore.UNKNOWN,
          status: SubscriptionStatus.ACTIVE,
          provider: SubscriptionProvider.REVENUECAT,
          currentPeriodStart: new Date(parseInt(event.purchased_at_ms)),
          currentPeriodEnd: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          expiresAt: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          lastRenewalDate: new Date(parseInt(event.purchased_at_ms)),
          isTrialPeriod: event.period_type === 'TRIAL',
          isActive: true,
          autoRenew: true,
          rawProviderData: event,
        },
      });

      if (subscription && !subscription.vendorId) {
        await this.prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            vendorSubscriptionId: subscription.id,
          },
        });
      }

      await this.createTransaction(vendor.id, event, subscription.id);

      this.logger.log(`✅ Subscription created for vendor: ${vendor.id}`);
      this.logger.log(`   Plan: ${subscriptionPlan?.name || 'Unknown'}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling initial purchase: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // ✅ FIXED: RENEWAL HANDLER
  // ============================================

  private async handleRenewal(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`🔄 Subscription renewal for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Product: ${event.product_id}`);
    this.logger.log(
      `   Expiration: ${event.expiration_at_ms ? new Date(parseInt(event.expiration_at_ms)).toISOString() : 'N/A'}`,
    );

    try {
      // Find the subscription plan
      const subscriptionPlan = await this.findSubscriptionPlanByProductId(
        event.product_id,
      );

      // Update subscription with ALL fields
      const updatedSubscription = await this.prisma.vendorSubscription.update({
        where: { vendorId: vendor.id },
        data: {
          // Update product and plan
          productId: event.product_id,
          subscriptionPlanId: subscriptionPlan?.id || null,
          entitlementId: event.entitlement_id || null,

          // Update dates
          currentPeriodEnd: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          expiresAt: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          currentPeriodStart: event.purchased_at_ms
            ? new Date(parseInt(event.purchased_at_ms))
            : null,

          // Update renewal date
          lastRenewalDate: new Date(),

          // Reset cancellation date
          cancellationDate: null,

          // Ensure active status
          status: SubscriptionStatus.ACTIVE,
          isActive: true,

          // Update auto-renew flag
          autoRenew: event.auto_renew !== undefined ? event.auto_renew : true,

          // Update store
          store: event.store || SubscriptionStore.UNKNOWN,

          // Update raw data
          rawProviderData: event,
        },
      });

      this.logger.log(`✅ Subscription renewed for vendor: ${vendor.id}`);
      this.logger.log(`   New product: ${updatedSubscription.productId}`);
      this.logger.log(
        `   New expiry: ${updatedSubscription.expiresAt?.toISOString()}`,
      );
      this.logger.log(`   Plan: ${subscriptionPlan?.name || 'Unknown'}`);

      // Create transaction record for renewal
      if (updatedSubscription) {
        await this.createTransaction(vendor.id, event, updatedSubscription.id);
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling renewal: ${error.message}`);
      throw error;
    }
  }

  private async handleCancellation(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`❌ Subscription cancelled for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Product: ${event.product_id}`);

    try {
      await this.prisma.vendorSubscription.update({
        where: { vendorId: vendor.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancellationDate: new Date(),
          autoRenew: false,
          isActive: false,
        },
      });

      this.logger.log(`✅ Subscription cancelled for vendor: ${vendor.id}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling cancellation: ${error.message}`);
      throw error;
    }
  }

  private async handleExpiration(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`⏰ Subscription expired for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Product: ${event.product_id}`);

    try {
      await this.prisma.vendorSubscription.update({
        where: { vendorId: vendor.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
          isActive: false,
        },
      });

      this.logger.log(`✅ Subscription expired for vendor: ${vendor.id}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling expiration: ${error.message}`);
      throw error;
    }
  }

  private async handleNonRenewingPurchase(
    vendor: any,
    payload: any,
  ): Promise<any> {
    const { event } = payload;
    this.logger.log(`🛍️ One-time purchase for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Product: ${event.product_id}`);

    try {
      await this.prisma.subscriptionTransaction.create({
        data: {
          vendorId: vendor.id,
          revenueCatEventId: event.id,
          revenueCatProductId: event.product_id,
          store: event.store,
          environment: event.environment,
          productId: event.product_id,
          transactionId: event.transaction_id,
          originalTransactionId: event.original_transaction_id,
          purchasedAt: new Date(parseInt(event.purchased_at_ms)),
          eventTimestamp: new Date(parseInt(event.event_timestamp_ms)),
          price: event.price,
          priceInPurchasedCurrency: event.price_in_purchased_currency,
          currency: event.currency || 'USD',
          periodType: PeriodType.NORMAL,
          rawData: event,
          status: SubscriptionTransactionStatus.COMPLETED,
        },
      });

      this.logger.log(`✅ One-time purchase recorded for vendor: ${vendor.id}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error handling non-renewing purchase: ${error.message}`,
      );
      throw error;
    }
  }

  // ============================================
  // ✅ FIXED: PRODUCT CHANGE HANDLER
  // ============================================

  private async handleProductChange(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`🔄 Product change for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   New product: ${event.product_id}`);

    try {
      const subscriptionPlan = await this.findSubscriptionPlanByProductId(
        event.product_id,
      );

      await this.prisma.vendorSubscription.update({
        where: { vendorId: vendor.id },
        data: {
          productId: event.product_id,
          subscriptionPlanId: subscriptionPlan?.id || null,
          entitlementId: event.entitlement_id || null,
          currentPeriodEnd: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          expiresAt: event.expiration_at_ms
            ? new Date(parseInt(event.expiration_at_ms))
            : null,
          status: SubscriptionStatus.ACTIVE,
          isActive: true,
          rawProviderData: event,
          cancellationDate: null,
        },
      });

      const subscription = await this.prisma.vendorSubscription.findUnique({
        where: { vendorId: vendor.id },
      });

      if (subscription) {
        await this.createTransaction(vendor.id, event, subscription.id);
      }

      this.logger.log(`✅ Product changed for vendor: ${vendor.id}`);
      this.logger.log(`   New plan: ${subscriptionPlan?.name || 'Unknown'}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling product change: ${error.message}`);
      throw error;
    }
  }

  private async handleRefund(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`💰 Refund issued for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Transaction: ${event.transaction_id}`);

    try {
      await this.prisma.subscriptionTransaction.updateMany({
        where: {
          transactionId: event.transaction_id,
          vendorId: vendor.id,
        },
        data: {
          status: SubscriptionTransactionStatus.REFUNDED,
        },
      });

      this.logger.log(`✅ Refund recorded for vendor: ${vendor.id}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling refund: ${error.message}`);
      throw error;
    }
  }

  private async handleUncancellation(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`↩️ Subscription uncancelled for vendor: ${vendor.id}`);
    this.logger.log(`   Vendor: ${vendor.businessName || vendor.vendorCode}`);
    this.logger.log(`   Product: ${event.product_id}`);

    try {
      await this.prisma.vendorSubscription.update({
        where: { vendorId: vendor.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
          cancellationDate: null,
          isActive: true,
        },
      });

      this.logger.log(`✅ Subscription reactivated for vendor: ${vendor.id}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling uncancellation: ${error.message}`);
      throw error;
    }
  }

  private async handleTestEvent(vendor: any, payload: any): Promise<any> {
    this.logger.log(`🧪 Test event received for vendor: ${vendor.id}`);
    this.logger.debug(`Test payload: ${JSON.stringify(payload, null, 2)}`);

    await this.prisma.revenueCatWebhookLog.create({
      data: {
        eventId: payload.event?.id,
        eventType: 'TEST',
        vendorId: vendor.id,
        rawPayload: payload,
        status: WebhookStatus.SUCCESS,
      },
    });

    return { success: true, message: 'Test event processed' };
  }

  // ============================================
  // TRANSACTION CREATION
  // ============================================

  private async createTransaction(
    vendorId: string,
    event: any,
    subscriptionId: string,
  ): Promise<any> {
    // Check if transaction already exists
    const existingTransaction =
      await this.prisma.subscriptionTransaction.findUnique({
        where: {
          transactionId: event.transaction_id || undefined,
        },
      });

    if (existingTransaction) {
      this.logger.log(
        `⚠️ Transaction ${event.transaction_id} already exists, skipping creation`,
      );
      return existingTransaction;
    }

    // Create new transaction
    return this.prisma.subscriptionTransaction.create({
      data: {
        vendorId,
        vendorSubscriptionId: subscriptionId,
        revenueCatEventId: event.id,
        revenueCatProductId: event.product_id,
        store: event.store,
        environment: event.environment,
        productId: event.product_id,
        transactionId: event.transaction_id || `temp_${Date.now()}`,
        originalTransactionId: event.original_transaction_id,
        purchasedAt: new Date(parseInt(event.purchased_at_ms)),
        expirationAt: event.expiration_at_ms
          ? new Date(parseInt(event.expiration_at_ms))
          : null,
        eventTimestamp: new Date(parseInt(event.event_timestamp_ms)),
        price: event.price,
        priceInPurchasedCurrency: event.price_in_purchased_currency,
        currency: event.currency || 'USD',
        periodType: event.period_type || PeriodType.NORMAL,
        isTrialPeriod: event.period_type === 'TRIAL',
        isFamilyShare: event.is_family_share || false,
        renewalNumber: event.renewal_number,
        status: SubscriptionTransactionStatus.COMPLETED,
        rawData: event,
      },
    });
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // This method is now implemented in the controller
    // Keeping for backward compatibility
    return true;
  }
}
