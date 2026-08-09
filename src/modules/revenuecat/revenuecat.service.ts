/* eslint-disable @typescript-eslint/no-unused-vars */
// revenuecat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SubscriptionStatus,
  SubscriptionProvider,
  SubscriptionStore,
  VendorSubscriptionStatus,
  PaymentFailureType,
  SubscriptionAction,
  VendorLiveStatus,
  VendorAdminStatus,
  WebhookStatus,
  PeriodType,
  SubscriptionTransactionStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);
  private readonly revenueCatApiKey: string;
  private readonly webhookSecret: string;
  private readonly GRACE_PERIOD_DAYS = 5;
  private readonly MAX_PAYMENT_FAILURES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.revenueCatApiKey =
      this.configService.get<string>('REVENUECAT_API_KEY') || '';
    this.webhookSecret =
      this.configService.get<string>('REVENUECAT_WEBHOOK_SECRET') || '';
  }

  // ============================================
  // PUBLIC METHODS (Called from Controller)
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

  async registerVendorWithRevenueCat(
    vendorId: string,
    userId: string,
    platform: 'ios' | 'android' = 'ios',
  ): Promise<void> {
    try {
      this.logger.log(`📝 Registering vendor ${vendorId} with RevenueCat...`);

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

      if (existingVendor?.vendorSubscription?.revenueCatAppUserId) {
        this.logger.log(
          `✅ Vendor ${vendorId} already has RevenueCat ID: ${existingVendor.vendorSubscription.revenueCatAppUserId}`,
        );
        return;
      }

      const revenueCatUserId = userId;

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

      await this.setRevenueCatAppUserId(revenueCatUserId, vendorId, platform);
    } catch (error: any) {
      this.logger.error(
        `Error registering vendor with RevenueCat: ${error.message}`,
      );
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

    if (vendor) return vendor;

    const userVendor = await this.prisma.vendor.findFirst({
      where: { ownerId: appUserId },
      include: {
        vendorSubscription: true,
      },
    });

    if (userVendor) return userVendor;

    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      const email = payload?.event?.subscriber_attributes?.$email?.value;
      if (email) {
        const vendorByEmail = await this.prisma.vendor.findFirst({
          where: {
            OR: [{ publicEmail: email }, { owner: { email: email } }],
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
  // SET REVENUECAT APP USER ID
  // ============================================

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
        `✅ RevenueCat app user ID set: ${appUserId} for vendor: ${vendorId}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Could not set RevenueCat app user ID: ${error.message}`,
      );
    }
  }

  // ============================================
  // TRANSACTION CREATION
  // ============================================

  private async createTransaction(
    vendorId: string,
    event: any,
    subscriptionId: string,
  ): Promise<any> {
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

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private async handleInitialPurchase(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`🎉 New subscription purchase for vendor: ${vendor.id}`);

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

      await this.reactivateVendor(vendor.id);
      await this.logPaymentSuccess(vendor.id);

      if (subscription) {
        await this.createTransaction(vendor.id, event, subscription.id);
      }

      await this.createSubscriptionHistory(
        vendor.id,
        SubscriptionAction.INITIAL_SUBSCRIPTION,
        VendorSubscriptionStatus.EXPIRED,
        VendorSubscriptionStatus.ACTIVE,
        'Initial subscription purchase',
      );

      this.logger.log(`✅ Vendor ${vendor.id} subscription active`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling initial purchase: ${error.message}`);
      throw error;
    }
  }

  private async handleRenewal(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`🔄 Subscription renewal for vendor: ${vendor.id}`);

    try {
      const subscriptionPlan = await this.findSubscriptionPlanByProductId(
        event.product_id,
      );

      const updatedSubscription = await this.prisma.vendorSubscription.update({
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
          currentPeriodStart: event.purchased_at_ms
            ? new Date(parseInt(event.purchased_at_ms))
            : null,
          lastRenewalDate: new Date(),
          cancellationDate: null,
          status: SubscriptionStatus.ACTIVE,
          isActive: true,
          autoRenew: event.auto_renew !== undefined ? event.auto_renew : true,
          store: event.store || SubscriptionStore.UNKNOWN,
          rawProviderData: event,
        },
      });

      await this.reactivateVendor(vendor.id);
      await this.logPaymentSuccess(vendor.id);

      if (updatedSubscription) {
        await this.createTransaction(vendor.id, event, updatedSubscription.id);
      }

      this.logger.log(
        `✅ Subscription renewed and vendor reactivated: ${vendor.id}`,
      );
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling renewal: ${error.message}`);
      throw error;
    }
  }

  private async handleCancellation(vendor: any, payload: any): Promise<any> {
    this.logger.log(`❌ Subscription cancelled for vendor: ${vendor.id}`);

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

      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          subscriptionStatus: VendorSubscriptionStatus.CANCELLED,
          status: VendorLiveStatus.OFFLINE,
          statusReason: 'Subscription cancelled by vendor',
          statusUpdatedAt: new Date(),
          subscriptionPausedAt: new Date(),
        },
      });

      await this.createSubscriptionHistory(
        vendor.id,
        SubscriptionAction.CANCELLATION,
        VendorSubscriptionStatus.ACTIVE,
        VendorSubscriptionStatus.CANCELLED,
        'Vendor cancelled subscription',
      );

      this.logger.log(
        `✅ Vendor ${vendor.id} subscription cancelled and offline`,
      );
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling cancellation: ${error.message}`);
      throw error;
    }
  }

  private async handleExpiration(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`⏰ Subscription expired for vendor: ${vendor.id}`);

    try {
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { id: vendor.id },
        select: {
          subscriptionStatus: true,
          paymentFailureCount: true,
          lastPaymentFailureAt: true,
        },
      });

      const failureCount = (existingVendor?.paymentFailureCount || 0) + 1;
      const now = new Date();

      if (failureCount >= this.MAX_PAYMENT_FAILURES) {
        this.logger.warn(
          `⚠️ Vendor ${vendor.id} has ${failureCount} failures, skipping grace period`,
        );
        await this.expireVendorImmediately(vendor.id);
        return {
          success: true,
          message: 'Vendor expired immediately due to multiple failures',
        };
      }

      const gracePeriodEnd = new Date(now);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);

      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          subscriptionStatus: VendorSubscriptionStatus.GRACE_PERIOD,
          subscriptionExpiresAt: gracePeriodEnd,
          subscriptionPausedAt: now,
          paymentFailureCount: failureCount,
          lastPaymentFailureAt: now,
          status: VendorLiveStatus.OFFLINE,
          statusReason: `Payment failed - Grace period until ${gracePeriodEnd.toISOString()}`,
          statusUpdatedAt: now,
        },
      });

      await this.logPaymentFailure(vendor.id, event);

      await this.createSubscriptionHistory(
        vendor.id,
        SubscriptionAction.GRACE_PERIOD_START,
        VendorSubscriptionStatus.EXPIRED,
        VendorSubscriptionStatus.GRACE_PERIOD,
        `Payment failed, grace period started. Expires: ${gracePeriodEnd.toISOString()}`,
      );

      await this.sendGracePeriodNotifications(vendor.id, gracePeriodEnd);

      await this.prisma.vendorSubscription.update({
        where: { vendorId: vendor.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
          isActive: false,
        },
      });

      this.logger.log(
        `✅ Vendor ${vendor.id} moved to GRACE_PERIOD until ${gracePeriodEnd.toISOString()}`,
      );
      return { success: true, gracePeriodEnd };
    } catch (error: any) {
      this.logger.error(`Error handling expiration: ${error.message}`);
      throw error;
    }
  }

  private async handleUncancellation(vendor: any, payload: any): Promise<any> {
    this.logger.log(`↩️ Subscription uncancelled for vendor: ${vendor.id}`);

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

      await this.reactivateVendor(vendor.id);

      await this.createSubscriptionHistory(
        vendor.id,
        SubscriptionAction.REACTIVATION,
        VendorSubscriptionStatus.CANCELLED,
        VendorSubscriptionStatus.ACTIVE,
        'Vendor uncancelled subscription',
      );

      this.logger.log(`✅ Vendor ${vendor.id} reactivated`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling uncancellation: ${error.message}`);
      throw error;
    }
  }

  private async handleNonRenewingPurchase(
    vendor: any,
    payload: any,
  ): Promise<any> {
    const { event } = payload;
    this.logger.log(`🛍️ One-time purchase for vendor: ${vendor.id}`);

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

  private async handleProductChange(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`🔄 Product change for vendor: ${vendor.id}`);

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
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling product change: ${error.message}`);
      throw error;
    }
  }

  private async handleRefund(vendor: any, payload: any): Promise<any> {
    const { event } = payload;
    this.logger.log(`💰 Refund issued for vendor: ${vendor.id}`);

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

  private async handleTestEvent(vendor: any, payload: any): Promise<any> {
    this.logger.log(`🧪 Test event received for vendor: ${vendor.id}`);

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
  // HELPER METHODS
  // ============================================

  private async reactivateVendor(vendorId: string): Promise<void> {
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        subscriptionStatus: VendorSubscriptionStatus.ACTIVE,
        subscriptionExpiresAt: null,
        subscriptionPausedAt: null,
        paymentFailureCount: 0,
        lastPaymentFailureAt: null,
        statusReason: null,
        adminStatus: VendorAdminStatus.ACTIVE,
        disabledAt: null,
      },
    });

    await this.createSubscriptionHistory(
      vendorId,
      SubscriptionAction.REACTIVATION,
      VendorSubscriptionStatus.GRACE_PERIOD,
      VendorSubscriptionStatus.ACTIVE,
      'Vendor reactivated after payment',
    );
  }

  private async expireVendorImmediately(vendorId: string): Promise<void> {
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        subscriptionStatus: VendorSubscriptionStatus.EXPIRED,
        status: VendorLiveStatus.OFFLINE,
        statusReason: 'Multiple payment failures - subscription expired',
        adminStatus: VendorAdminStatus.DISABLED,
        disabledAt: new Date(),
        statusUpdatedAt: new Date(),
      },
    });

    await this.createSubscriptionHistory(
      vendorId,
      SubscriptionAction.EXPIRATION,
      VendorSubscriptionStatus.GRACE_PERIOD,
      VendorSubscriptionStatus.EXPIRED,
      'Multiple payment failures, expired immediately',
    );
  }

  private async logPaymentFailure(vendorId: string, event: any): Promise<void> {
    let failureType: PaymentFailureType = PaymentFailureType.OTHER;

    if (event.error) {
      const errorLower = event.error.toLowerCase();
      if (errorLower.includes('card') && errorLower.includes('expir')) {
        failureType = PaymentFailureType.CARD_EXPIRED;
      } else if (
        errorLower.includes('insufficient') ||
        errorLower.includes('fund')
      ) {
        failureType = PaymentFailureType.INSUFFICIENT_FUNDS;
      } else if (errorLower.includes('declin')) {
        failureType = PaymentFailureType.DECLINED;
      } else if (errorLower.includes('removed')) {
        failureType = PaymentFailureType.PAYMENT_METHOD_REMOVED;
      } else if (errorLower.includes('address')) {
        failureType = PaymentFailureType.BILLING_ADDRESS_INVALID;
      }
    }

    await this.prisma.paymentFailureLog.create({
      data: {
        vendorId,
        failureType,
        errorMessage: event.error || 'Payment failed',
        amount: event.price,
        currency: event.currency || 'USD',
        notificationSent: false,
        createdAt: new Date(),
      },
    });
  }

  private async logPaymentSuccess(vendorId: string): Promise<void> {
    await this.prisma.paymentFailureLog.updateMany({
      where: {
        vendorId,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
        resolvedBy: 'system',
        resolution: 'Payment successful',
      },
    });
  }

  private async createSubscriptionHistory(
    vendorId: string,
    action: SubscriptionAction,
    oldStatus: VendorSubscriptionStatus,
    newStatus: VendorSubscriptionStatus,
    reason?: string,
  ): Promise<void> {
    await this.prisma.subscriptionHistory.create({
      data: {
        vendorId,
        action,
        oldStatus,
        newStatus,
        reason,
        performedBy: 'system',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  private async sendGracePeriodNotifications(
    vendorId: string,
    gracePeriodEnd: Date,
  ): Promise<void> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          owner: {
            select: {
              email: true,
              fcm_token: true,
              platform: true,
            },
          },
        },
      });

      if (!vendor) return;

      const daysLeft = Math.ceil(
        (gracePeriodEnd.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );

      this.logger.log(
        `📧 Sending grace period email to ${vendor.owner.email} for vendor ${vendorId}`,
      );

      if (vendor.owner.fcm_token) {
        this.logger.log(`📱 Sending push notification to vendor ${vendorId}`);
      }

      await this.prisma.paymentFailureLog.updateMany({
        where: {
          vendorId,
          notificationSent: false,
        },
        data: {
          notificationSent: true,
        },
      });
    } catch (error: any) {
      this.logger.error(`Error sending notifications: ${error.message}`);
    }
  }

  private async sendFinalExpirationNotification(
    vendorId: string,
  ): Promise<void> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          owner: {
            select: {
              email: true,
            },
          },
        },
      });

      if (vendor) {
        this.logger.log(
          `📧 Sending final expiration email to ${vendor.owner.email}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Error sending final notification: ${error.message}`);
    }
  }

  // ============================================
  // CRON JOB: CHECK EXPIRED GRACE PERIODS
  // ============================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredGracePeriods(): Promise<void> {
    this.logger.log('🔄 Checking for expired grace periods...');

    const now = new Date();

    try {
      const expiredVendors = await this.prisma.vendor.findMany({
        where: {
          subscriptionStatus: VendorSubscriptionStatus.GRACE_PERIOD,
          subscriptionExpiresAt: {
            lt: now,
          },
        },
        include: {
          vendorSubscription: true,
        },
      });

      this.logger.log(
        `Found ${expiredVendors.length} vendors with expired grace periods`,
      );

      for (const vendor of expiredVendors) {
        this.logger.log(`⏰ Grace period expired for vendor: ${vendor.id}`);

        await this.prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            subscriptionStatus: VendorSubscriptionStatus.EXPIRED,
            status: VendorLiveStatus.OFFLINE,
            adminStatus: VendorAdminStatus.DISABLED,
            statusReason: 'Grace period expired - subscription not renewed',
            disabledAt: now,
            statusUpdatedAt: now,
          },
        });

        if (vendor.vendorSubscription) {
          await this.prisma.vendorSubscription.update({
            where: { vendorId: vendor.id },
            data: {
              status: SubscriptionStatus.EXPIRED,
              isActive: false,
            },
          });
        }

        await this.createSubscriptionHistory(
          vendor.id,
          SubscriptionAction.GRACE_PERIOD_END,
          VendorSubscriptionStatus.GRACE_PERIOD,
          VendorSubscriptionStatus.EXPIRED,
          'Grace period ended without renewal',
        );

        await this.sendFinalExpirationNotification(vendor.id);

        this.logger.log(`✅ Vendor ${vendor.id} expired after grace period`);
      }

      this.logger.log('✅ Grace period check completed');
    } catch (error: any) {
      this.logger.error(`Error checking grace periods: ${error.message}`);
    }
  }

  // ============================================
  // ADMIN METHODS (Public)
  // ============================================

  async adminReactivateVendor(
    vendorId: string,
    adminId: string,
  ): Promise<void> {
    this.logger.log(`🔧 Admin ${adminId} reactivating vendor ${vendorId}`);

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        subscriptionStatus: VendorSubscriptionStatus.ACTIVE,
        subscriptionExpiresAt: null,
        subscriptionPausedAt: null,
        paymentFailureCount: 0,
        lastPaymentFailureAt: null,
        statusReason: null,
        adminStatus: VendorAdminStatus.ACTIVE,
        disabledAt: null,
      },
    });

    await this.createSubscriptionHistory(
      vendorId,
      SubscriptionAction.ADMIN_REACTIVATE,
      VendorSubscriptionStatus.EXPIRED,
      VendorSubscriptionStatus.ACTIVE,
      `Admin ${adminId} reactivated vendor`,
    );
  }

  async adminSuspendVendor(
    vendorId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    this.logger.log(`🔧 Admin ${adminId} suspending vendor ${vendorId}`);

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        subscriptionStatus: VendorSubscriptionStatus.PAUSED,
        status: VendorLiveStatus.OFFLINE,
        statusReason: `Admin suspended: ${reason}`,
        adminStatus: VendorAdminStatus.SUSPENDED,
        suspendedAt: new Date(),
        statusUpdatedAt: new Date(),
      },
    });

    await this.createSubscriptionHistory(
      vendorId,
      SubscriptionAction.ADMIN_SUSPEND,
      VendorSubscriptionStatus.ACTIVE,
      VendorSubscriptionStatus.PAUSED,
      `Admin ${adminId} suspended vendor: ${reason}`,
    );
  }
}
