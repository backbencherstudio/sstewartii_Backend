import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getMessaging, Messaging, Message } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';
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

export interface FirebaseUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  provider: 'google' | 'apple' | 'facebook' | 'twitter';
  providerId?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: Messaging | null = null;
  private auth: Auth | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      const app = initializeFirebase(this.configService);
      this.messaging = getMessaging(app);
      this.auth = getAuth(app);
      this.logger.log('✅ Firebase initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to initialize Firebase: ${errorMessage}`);
    }
  }

  // ============ AUTHENTICATION METHODS ============

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<FirebaseUser> {
    try {
      if (!this.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const decodedToken = await this.auth.verifyIdToken(idToken);

      // Extract user info
      const firebaseUser: FirebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        picture: decodedToken.picture || '',
        emailVerified: decodedToken.email_verified || false,
        provider: this.getProviderFromToken(decodedToken),
        providerId:
          decodedToken.firebase?.identities?.['google.com']?.[0] ||
          decodedToken.firebase?.identities?.['apple.com']?.[0] ||
          undefined,
      };

      return firebaseUser;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Token verification failed: ${errorMessage}`);
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByUid(uid: string): Promise<FirebaseUser | null> {
    try {
      if (!this.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const userRecord = await this.auth.getUser(uid);

      return {
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || '',
        picture: userRecord.photoURL || '',
        emailVerified: userRecord.emailVerified || false,
        provider: this.getProviderFromUser(userRecord),
        providerId: userRecord.providerData?.[0]?.uid || undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to get user: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Create custom token for Firebase authentication
   */
  async createCustomToken(
    uid: string,
    claims?: Record<string, any>,
  ): Promise<string> {
    try {
      if (!this.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const customToken = await this.auth.createCustomToken(uid, claims);
      return customToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to create custom token: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Set custom user claims
   */
  async setCustomUserClaims(
    uid: string,
    claims: Record<string, any>,
  ): Promise<void> {
    try {
      if (!this.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      await this.auth.setCustomUserClaims(uid, claims);
      this.logger.log(`✅ Custom claims set for user: ${uid}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to set custom claims: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generate a Firebase login URL for Google (for web)
   */
  getGoogleAuthUrl(): string {
    const clientId = this.configService.get<string>(
      'FIREBASE_GOOGLE_CLIENT_ID',
    );
    const redirectUri = this.configService.get<string>(
      'FIREBASE_GOOGLE_REDIRECT_URI',
    );
    const scope = 'email profile';

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
  }

  /**
   * Generate a Firebase login URL for Apple (for web)
   */
  getAppleAuthUrl(): string {
    const clientId = this.configService.get<string>('FIREBASE_APPLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>(
      'FIREBASE_APPLE_REDIRECT_URI',
    );
    const scope = 'name email';
    const responseType = 'code';
    const responseMode = 'form_post';
    const state = 'APPLE_AUTH';

    return `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}&response_mode=${responseMode}`;
  }

  // ============ PUSH NOTIFICATION METHODS ============

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

  // ============ PRIVATE HELPERS ============

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }

  private getProviderFromToken(
    decodedToken: any,
  ): 'google' | 'apple' | 'facebook' | 'twitter' {
    if (decodedToken.firebase?.identities?.['google.com']) {
      return 'google';
    }
    if (decodedToken.firebase?.identities?.['apple.com']) {
      return 'apple';
    }
    if (decodedToken.firebase?.identities?.['facebook.com']) {
      return 'facebook';
    }
    if (decodedToken.firebase?.identities?.['twitter.com']) {
      return 'twitter';
    }
    return 'google'; // default fallback
  }

  private getProviderFromUser(
    userRecord: any,
  ): 'google' | 'apple' | 'facebook' | 'twitter' {
    const providerId = userRecord.providerData?.[0]?.providerId || '';

    if (providerId.includes('google')) return 'google';
    if (providerId.includes('apple')) return 'apple';
    if (providerId.includes('facebook')) return 'facebook';
    if (providerId.includes('twitter')) return 'twitter';

    return 'google'; // default fallback
  }
}
