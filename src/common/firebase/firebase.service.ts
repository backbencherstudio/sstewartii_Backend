import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getMessaging, Messaging, Message } from 'firebase-admin/messaging';
import { initializeFirebase } from '@/config/firebase.config';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: Messaging | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      const app = initializeFirebase(this.configService);
      this.messaging = getMessaging(app);
      this.logger.log('✅ Firebase initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to initialize Firebase: ${errorMessage}`);
    }
  }

  async sendToDevice(
    fcmToken: string,
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      if (!fcmToken) {
        return { success: false, error: 'FCM token is required' };
      }

      if (!this.messaging) {
        this.logger.error('❌ Firebase not initialized');
        return { success: false, error: 'Firebase not initialized' };
      }

      const message: Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        android: {
          priority: 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'atlass_notifications',
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: payload.sound || 'default',
              badge: payload.badge || 1,
            },
          },
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            vibrate: [100, 50, 100],
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`✅ Push notification sent: ${response}`);

      return { success: true, messageId: response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Push notification failed: ${errorMessage}`);

      if (errorMessage.includes('registration-token-not-registered')) {
        return { success: false, error: 'INVALID_TOKEN' };
      }
      if (errorMessage.includes('messaging/token-unregistered')) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      return { success: false, error: errorMessage };
    }
  }

  async sendToDevices(
    fcmTokens: string[],
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult[]> {
    const results: PushNotificationResult[] = [];
    const batchSize = 500;

    for (let i = 0; i < fcmTokens.length; i += batchSize) {
      const batch = fcmTokens.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((token) => this.sendToDevice(token, payload)),
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    }

    return results;
  }

  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      if (!this.messaging) {
        this.logger.error('❌ Firebase not initialized');
        return { success: false, error: 'Firebase not initialized' };
      }

      const message: Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        android: {
          priority: 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'atlass_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: payload.sound || 'default',
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`✅ Topic notification sent: ${response}`);

      return { success: true, messageId: response };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Topic notification failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      if (!this.messaging) {
        this.logger.error('❌ Firebase not initialized');
        return;
      }

      const response = await this.messaging.subscribeToTopic(tokens, topic);
      this.logger.log(
        `✅ Subscribed ${response.successCount} devices to topic: ${topic}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to subscribe to topic: ${errorMessage}`);
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      if (!this.messaging) {
        this.logger.error('❌ Firebase not initialized');
        return;
      }

      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      this.logger.log(
        `✅ Unsubscribed ${response.successCount} devices from topic: ${topic}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to unsubscribe from topic: ${errorMessage}`);
      throw error;
    }
  }

  validateToken(fcmToken: string): boolean {
    try {
      if (!fcmToken) return false;
      return fcmToken.length > 20;
    } catch {
      return false;
    }
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }
}
