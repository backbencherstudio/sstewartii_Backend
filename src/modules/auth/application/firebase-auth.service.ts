import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { FirebaseService } from '@/common/firebase/firebase.service';

@Injectable()
export class FirebaseAuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle Firebase login with ID token
   */
  async handleFirebaseLogin(idToken: string, provider: 'google' | 'apple') {
    try {
      // 1. Verify Firebase token
      const firebaseUser = await this.firebaseService.verifyIdToken(idToken);

      if (!firebaseUser.email) {
        throw new UnauthorizedException('Email not provided by provider');
      }

      // 2. Check if user exists in your database
      let user = await this.authService.findUserByEmail(firebaseUser.email);

      if (!user) {
        // 3. Create new user
        user = await this.authService.createSocialUser({
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
          firebaseUid: firebaseUser.uid,
          provider,
          emailVerified: firebaseUser.emailVerified,
          avatar: firebaseUser.picture || null,
        });

        // 4. Set custom claims in Firebase (optional)
        await this.firebaseService.setCustomUserClaims(firebaseUser.uid, {
          userId: user.id,
          role: user.role || 'user',
        });
      } else {
        // 5. Update existing user with Firebase UID if not set
        if (!user.firebaseUid) {
          await this.authService.updateFirebaseUid(user.id, firebaseUser.uid);
        }

        // 6. Update email verification status if needed
        if (firebaseUser.emailVerified && !user.emailVerified) {
          await this.authService.updateEmailVerification(user.id, true);
        }
      }

      // 7. Generate JWT tokens for your application
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          provider,
          firebaseUid: firebaseUser.uid,
        },
        {
          secret: this.configService.get('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      );

      const refreshToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          provider,
          firebaseUid: firebaseUser.uid,
        },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      );

      return {
        user,
        tokens: { accessToken, refreshToken },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(
        `Firebase authentication failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Handle Firebase login with authorization code (for web OAuth flow)
   */
  async handleFirebaseCodeLogin(
    code: string,
    provider: 'google' | 'apple',
    redirectUri?: string,
  ) {
    try {
      // Exchange code for Firebase ID token
      const idToken = await this.exchangeCodeForToken(
        code,
        provider,
        redirectUri,
      );

      // Use the ID token for login
      return this.handleFirebaseLogin(idToken, provider);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(
        `Failed to exchange code: ${errorMessage}`,
      );
    }
  }

  /**
   * Exchange authorization code for Firebase ID token
   */
  private async exchangeCodeForToken(
    code: string,
    provider: 'google' | 'apple',
    redirectUri?: string,
  ): Promise<string> {
    if (provider === 'google') {
      const clientId =
        this.configService.get<string>('FIREBASE_GOOGLE_CLIENT_ID') ||
        this.configService.get<string>('google.clientId');
      const clientSecret =
        this.configService.get<string>('FIREBASE_GOOGLE_CLIENT_SECRET') ||
        this.configService.get<string>('google.clientSecret');
      const redirect =
        redirectUri ||
        this.configService.get<string>('FIREBASE_GOOGLE_REDIRECT_URI') ||
        this.configService.get<string>('google.callbackUrl');

      // Use URLSearchParams with append method
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', clientId || '');
      params.append('client_secret', clientSecret || '');
      params.append('redirect_uri', redirect || '');
      params.append('grant_type', 'authorization_code');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange code');
      }

      return data.id_token;
    }

    if (provider === 'apple') {
      const clientId =
        this.configService.get<string>('FIREBASE_APPLE_CLIENT_ID') ||
        this.configService.get<string>('apple.clientId');
      const clientSecret = this.createAppleClientSecret();
      const redirect =
        redirectUri ||
        this.configService.get<string>('FIREBASE_APPLE_REDIRECT_URI') ||
        this.configService.get<string>('apple.callbackUrl');

      // Use URLSearchParams with append method
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', clientId || '');
      params.append('client_secret', clientSecret);
      params.append('redirect_uri', redirect || '');
      params.append('grant_type', 'authorization_code');

      const response = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange code');
      }

      return data.id_token;
    }

    throw new BadRequestException('Unsupported provider');
  }

  /**
   * Create Apple client secret (JWT)
   */
  private createAppleClientSecret(): string {
    // Implement Apple client secret generation
    // You'll need to use your Apple private key to sign the JWT
    // For now, return a placeholder
    return 'apple-client-secret-placeholder';
  }

  /**
   * Get Google OAuth URL for web
   */
  getGoogleAuthUrl(): string {
    return this.firebaseService.getGoogleAuthUrl();
  }

  /**
   * Get Apple OAuth URL for web
   */
  getAppleAuthUrl(): string {
    return this.firebaseService.getAppleAuthUrl();
  }

  /**
   * Handle user logout from Firebase (optional)
   */
  async revokeFirebaseTokens(uid: string): Promise<void> {
    try {
      await this.firebaseService.setCustomUserClaims(uid, {});
      // Optionally revoke refresh tokens
      // await this.auth.revokeRefreshTokens(uid);
    } catch (error) {
      console.error('Failed to revoke Firebase tokens:', error);
    }
  }
}
