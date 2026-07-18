/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import type { IUserRepository } from '../domain/interfaces/user.repository.interface';
import type { IOtpRepository } from '../domain/interfaces/otp.repository.interface';
import { User, UserProps } from '../domain/entities/user.entity';
import { AuthOtpQueueService } from '../infrastructure/queues/auth-otp-queue.service';
import { RegisterDto } from '../presentation/dto/registerDto/register.dto';
import { LoginDto } from '../presentation/dto/loginDto/login.dto';
import { MailService } from 'src/common/mail/mail.service';
import { VerifyOtpDto } from '../presentation/dto/mail/otp.dto';
import { RecoverAccountVerifyDto } from '../presentation/dto/delete-account/recover-account-verify.dto';
import { VerifyDeletionOtpDto } from '../presentation/dto/delete-account/verify-deletion-otp.dto';
import { DeletionStatusDto } from '../presentation/dto/delete-account/deletion-status.dto';
import {
  DevicePlatform,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { RevenueCatService } from '@/modules/revenuecat/revenuecat.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationHelperService } from '@/common/shared/notification.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IOtpRepository')
    private readonly otpRepository: IOtpRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly authOtpQueueService: AuthOtpQueueService,
    private readonly revenueCatService: RevenueCatService,
    private readonly prisma: PrismaService,
    private readonly notificationHelperService: NotificationHelperService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      this.configService.get<string>('google.callbackUrl'),
    );
  }

  // ============ FIREBASE SOCIAL AUTH METHODS ============

  /**
   * Find user by email (for Firebase auth)
   */
  async findUserByEmail(email: string): Promise<any> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Find user by Firebase UID
   */
  async findUserByFirebaseUid(firebaseUid: string): Promise<any> {
    return this.userRepository.findByFirebaseUid(firebaseUid);
  }

  /**
   * Create a new user from social provider (Google/Apple via Firebase)
   */
  async createSocialUser(data: {
    email: string;
    name: string;
    firebaseUid: string;
    provider: 'google' | 'apple' | 'facebook' | 'twitter';
    emailVerified: boolean;
    avatar?: string | null;
  }): Promise<any> {
    // Generate a random password for social users
    const randomPassword = await bcrypt.hash(
      Math.random().toString(36) + Date.now().toString(),
      10,
    );

    const userProps: UserProps = {
      id: uuidv4(),
      email: data.email,
      name: data.name,
      password: randomPassword,
      provider: data.provider.toUpperCase(),
      isEmailVerified: data.emailVerified,
      fcm_token: null,
      platform: null,
      googleId: data.provider === 'google' ? data.firebaseUid : null,
      appleId: data.provider === 'apple' ? data.firebaseUid : null,
      isDeleted: false,
      deletionScheduledAt: null,
      deletionReason: null,
      refreshToken: null,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newUser = new User(userProps);
    const savedUser = await this.userRepository.create(newUser, 'USER');

    this.logger.log(
      `✅ Social user created: ${savedUser.email} via ${data.provider}`,
    );

    return savedUser;
  }

  /**
   * Update Firebase UID for existing user
   * Note: Since your User entity doesn't have a firebaseUid field,
   * we'll use googleId or appleId to store the Firebase UID
   */
  async updateFirebaseUid(userId: string, firebaseUid: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Store Firebase UID in the appropriate field based on provider
    // If you want to add a dedicated firebaseUid field, you can add it to the User entity
    // For now, we'll use googleId or appleId
    const updateData: any = {};

    if (user.provider === 'GOOGLE') {
      updateData.googleId = firebaseUid;
    } else if (user.provider === 'APPLE') {
      updateData.appleId = firebaseUid;
    } else {
      // If user was LOCAL but now using social login, update provider
      updateData.provider = user.provider || 'GOOGLE';
      if (user.provider === 'GOOGLE' || !user.provider) {
        updateData.googleId = firebaseUid;
      } else if (user.provider === 'APPLE') {
        updateData.appleId = firebaseUid;
      }
    }

    await this.userRepository.update(userId, updateData);
    this.logger.log(`✅ Firebase UID updated for user: ${userId}`);
  }

  /**
   * Update email verification status
   */
  async updateEmailVerification(
    userId: string,
    verified: boolean,
  ): Promise<void> {
    await this.userRepository.update(userId, { isEmailVerified: verified });
    this.logger.log(
      `✅ Email verification updated for user: ${userId} -> ${verified}`,
    );
  }

  // ============ REGISTER ============
  async register(registerDto: RegisterDto): Promise<any> {
    const {
      email,
      password,
      confirmPassword,
      accountType,
      name,
      fcmToken,
      platform,
    } = registerDto;

    if (password !== confirmPassword)
      throw new BadRequestException('Passwords do not match');

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Ensure platform is properly formatted
    let platformValue: DevicePlatform | null = null;
    if (platform) {
      const platformString = platform.toString().toUpperCase();
      if (
        platformString === 'IOS' ||
        platformString === 'ANDROID' ||
        platformString === 'WEB'
      ) {
        platformValue = platformString;
      }
    }

    const userProps: UserProps = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      platform: platformValue,
      fcm_token: fcmToken || null,
      provider: 'LOCAL',
      isEmailVerified: false,
      isDeleted: false,
      deletionScheduledAt: null,
      deletionReason: null,
      refreshToken: null,
      permissions: [],
      googleId: null,
      appleId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newUser = new User(userProps);
    const roleType = accountType === 'VENDOR' ? 'VENDOR' : 'USER';
    const savedUser = await this.userRepository.create(newUser, roleType);

    // ✅ If user is a vendor, create vendor and register with RevenueCat
    if (roleType === 'VENDOR') {
      try {
        // ✅ Create vendor directly using Prisma
        const vendor = await this.prisma.vendor.create({
          data: {
            ownerId: savedUser.id,
            vendorCode: `VENDOR_${Date.now()}`,
            businessName: name || 'My Food Truck',
            publicEmail: email,
            contactNumber: '',
            bio: '',
            onboardingStep: 1,
            kycStatus: 'UNVERIFIED',
            status: 'OFFLINE',
            adminStatus: 'ACTIVE',
          },
        });

        // ✅ Register vendor with RevenueCat
        const platformType = platformValue === 'ANDROID' ? 'android' : 'ios';
        await this.revenueCatService.registerVendorWithRevenueCat(
          vendor.id,
          savedUser.id,
          platformType,
        );

        this.logger.log(
          `✅ Vendor ${vendor.id} registered with RevenueCat on signup`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to register vendor with RevenueCat: ${error.message}`,
        );
        // Don't fail the registration if RevenueCat fails
      }
    }

    // Send verification OTP
    await this.authOtpQueueService.addEmailVerificationOtpJob({
      userId: savedUser.id,
      email: savedUser.email,
    });

    return {
      message: 'Registration Successful',
      data: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role?.name,
        isVerified: savedUser.isEmailVerified,
      },
    };
  }

  // ---------- LOGIN (with deletion info) ----------
  async login(loginDto: LoginDto): Promise<any> {
    const { email, password, fcmToken, platform } = loginDto;
    const user = await this.userRepository.findUserByEmailForLogin(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is permanently deleted
    if (user.isDeleted) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Update FCM token and platform if provided
    if (fcmToken || platform) {
      const updateData: any = {};

      if (fcmToken) {
        updateData.fcm_token = fcmToken;
      }

      if (platform) {
        // ✅ Ensure platform is in the correct format
        const platformValue = platform.toUpperCase();
        updateData.platform = platformValue;
        console.log(`📱 Updating platform to: ${platformValue}`);
      }

      await this.userRepository.update(user.id, updateData);
      this.logger.log(
        `✅ Updated user ${user.id} with: ${JSON.stringify(updateData)}`,
      );
    }

    // ✅ If user is a vendor, sync with RevenueCat
    if (user.role?.name === 'VENDOR') {
      try {
        const vendor = await this.prisma.vendor.findUnique({
          where: { ownerId: user.id },
        });

        if (vendor) {
          const platformType = platform === 'ANDROID' ? 'android' : 'ios';
          await this.revenueCatService.registerVendorWithRevenueCat(
            vendor.id,
            user.id,
            platformType,
          );
          this.logger.log(
            `✅ Vendor ${vendor.id} synced with RevenueCat on login`,
          );
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to sync vendor with RevenueCat on login: ${error.message}`,
        );
      }
    }

    // Check for scheduled deletion and calculate days left
    let deletionInfo: {
      scheduled: boolean;
      daysLeft: number;
      scheduledDate: Date;
    } | null = null;

    if (user.deletionScheduledAt) {
      const now = new Date();
      const daysLeft = Math.ceil(
        (user.deletionScheduledAt.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysLeft > 0) {
        deletionInfo = {
          scheduled: true,
          daysLeft,
          scheduledDate: user.deletionScheduledAt,
        };
      } else {
        // Past scheduled date - should have been deleted by cron, but fallback
        await this.userRepository.permanentlyDeleteUser(user.id);
        throw new UnauthorizedException('Account has been deleted');
      }
    }

    // Send verification OTP if email not verified
    if (!user.isEmailVerified) {
      await this.authOtpQueueService.addEmailVerificationOtpJob({
        userId: user.id,
        email: user.email,
      });
    }

    // Generate tokens
    const token = await this.getTokens(user.id, user.email, user.role.name);
    await this.updateRefreshTokenHash(user.id, token.refreshToken);

    const locationState = this.buildLocationState(user);

    try {
      await this.notificationHelperService.sendToUser(user.id, {
        title: 'Welcome Back! 🎉',
        body: `Hello ${user.email}, you've successfully logged in. WebSocket is working!`,
        type: NotificationType.NEW_ORDER,
        channel: NotificationChannel.PUSH,
        data: {
          screen: 'home',
          action: 'login_success',
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(
        `✅ Welcome notification sent to user ${user.id} via WebSocket`,
      );
    } catch (error: any) {
      // Don't block login if notification fails
      this.logger.error(
        `Failed to send welcome notification: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role?.name,
          isVerified: user.isEmailVerified,
          hasLocation: locationState.hasLocation,
          locationRequired: locationState.locationRequired,
          nextStep: locationState.nextStep,
        },
        deletionInfo, // null if not scheduled, object if in grace period
      },
    };
  }

  private buildLocationState(user: any): {
    hasLocation: boolean;
    locationRequired: boolean;
    nextStep: string;
  } {
    const role = user.role?.name;
    if (role === 'USER') {
      const hasLocation =
        typeof user.customer?.latitude === 'number' &&
        typeof user.customer?.longitude === 'number';
      return {
        hasLocation,
        locationRequired: !hasLocation,
        nextStep: hasLocation ? 'HOME' : 'SET_CUSTOMER_LOCATION',
      };
    }
    if (role === 'VENDOR') {
      const hasLocation =
        typeof user.vendorStore?.serviceArea?.latitude === 'number' &&
        typeof user.vendorStore?.serviceArea?.longitude === 'number';
      return {
        hasLocation,
        locationRequired: !hasLocation,
        nextStep: hasLocation ? 'VENDOR_HOME' : 'SET_VENDOR_SERVICE_AREA',
      };
    }
    return { hasLocation: false, locationRequired: false, nextStep: 'HOME' };
  }

  // ---------- TOKEN HELPERS ----------
  private async getTokens(
    userId: string,
    email: string,
    roleName: string,
  ): Promise<any> {
    const jwtPayload = { sub: userId, email, roleName };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '7d',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: '1d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.updateRefreshToken(userId, hash);
  }

  async refreshToken(userId: string, refreshToken: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new ForbiddenException('Access Denied');

    const storedHash = await this.userRepository.getRefreshToken(userId);
    if (!storedHash) throw new ForbiddenException('Access Denied');

    const isValid = await bcrypt.compare(refreshToken, storedHash);
    if (!isValid) throw new ForbiddenException('Access Denied');

    const token = await this.getTokens(user.id, user.email, user.role.name);
    await this.updateRefreshTokenHash(user.id, token.refreshToken);
    return token;
  }

  // ---------- OTP HELPERS ----------
  private async generateAndSendOtp(
    user: { id: string; email: string },
    type:
      | 'EMAIL_VERIFICATION'
      | 'PASSWORD_RESET'
      | 'DELETE_ACCOUNT'
      | 'RECOVER_ACCOUNT',
  ): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.create(user.id, hashedOtp, type, expiresAt);

    const purposeMap: Record<string, string> = {
      EMAIL_VERIFICATION: 'Verification',
      PASSWORD_RESET: 'Password Reset',
      DELETE_ACCOUNT: 'Account Deletion',
      RECOVER_ACCOUNT: 'Account Recovery',
    };
    const purpose = purposeMap[type];
    await this.mailService.sendOtpEmail(
      user.email,
      otp,
      purpose as 'Verification' | 'Password Reset',
    );
  }

  private async validateOtp(
    userId: string,
    plainOtp: string,
    type:
      | 'EMAIL_VERIFICATION'
      | 'PASSWORD_RESET'
      | 'DELETE_ACCOUNT'
      | 'RECOVER_ACCOUNT',
  ): Promise<void> {
    const record = await this.otpRepository.findLatest(userId, type);
    if (!record) throw new BadRequestException('Invalid or expired OTP');
    if (record.expiresAt < new Date())
      throw new BadRequestException('OTP expired');
    const isValid = await bcrypt.compare(plainOtp, record.otp);
    if (!isValid) throw new BadRequestException('Invalid OTP');
    await this.otpRepository.deleteUserOtps(userId, type);
  }

  // ---------- EMAIL VERIFICATION ----------
  async requestEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isEmailVerified)
      throw new BadRequestException('Email already verified');
    await this.authOtpQueueService.addEmailVerificationOtpJob({
      userId: user.id,
      email: user.email,
    });
  }

  async verifyEmail(dto: VerifyOtpDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid request');
    await this.validateOtp(user.id, dto.otp, 'EMAIL_VERIFICATION');
    await this.userRepository.update(user.id, { isEmailVerified: true });
  }

  // ---------- PASSWORD RESET ----------
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (user && user.provider === 'LOCAL') {
      await this.authOtpQueueService.addPasswordResetOtpJob({
        userId: user.id,
        email: user.email,
      });
    }
  }

  async verifyResetOtp(dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid request');
    await this.validateOtp(user.id, dto.otp, 'PASSWORD_RESET');
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'PASSWORD_RESET_TOKEN' },
      { secret: this.configService.get('jwt.resetSecret'), expiresIn: '10m' },
    );
    return { resetToken };
  }

  async resetPasswordWithToken(
    resetToken: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync(resetToken, {
        secret: this.configService.get('jwt.resetSecret'),
      });
      if (payload.type !== 'PASSWORD_RESET_TOKEN')
        throw new UnauthorizedException('Invalid token type');
      const hashed = await bcrypt.hash(newPassword, 10);
      await this.userRepository.update(payload.sub, {
        password: hashed,
        refreshToken: null,
      });
    } catch {
      throw new UnauthorizedException('Reset session expired or invalid');
    }
  }

  // ---------- CHANGE PASSWORD ----------
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmNewPassword)
      throw new BadRequestException('Passwords do not match');
    const user = await this.userRepository.findUserWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.password)
      throw new BadRequestException(
        'OAuth users cannot change password via this endpoint.',
      );
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid)
      throw new UnauthorizedException('Current password is incorrect');
    const same = await bcrypt.compare(newPassword, user.password);
    if (same)
      throw new BadRequestException(
        'New password must be different from current',
      );
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashed);
  }

  // ---------- DELETE ACCOUNT ----------
  async requestDeletion(
    userId: string,
    password: string,
    reason?: string,
  ): Promise<{ otp?: string }> {
    // Get user with deletion info
    const user = await this.userRepository.findUserWithPassword(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if account is already deleted
    if (user.isDeleted) {
      throw new BadRequestException('Account already deleted');
    }

    // Check if deletion is already scheduled
    if (user.deletionScheduledAt) {
      const now = new Date();
      const daysRemaining = Math.ceil(
        (user.deletionScheduledAt.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysRemaining > 0) {
        throw new BadRequestException(
          `Account deletion already scheduled. ${daysRemaining} days remaining in grace period.`,
        );
      }
      throw new BadRequestException('Account deletion period has expired');
    }

    // Check if user has a password (not OAuth)
    if (!user.password) {
      throw new BadRequestException(
        'OAuth users cannot delete via password. Please use your provider.',
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Get full user for email
    const fullUser = await this.userRepository.findById(userId);
    if (!fullUser) {
      throw new NotFoundException('User not found');
    }

    // Send OTP via queue
    const result = await this.authOtpQueueService.addDeleteAccountOtpJob({
      userId: userId,
      email: fullUser.email,
    });

    if (process.env.NODE_ENV === 'development') {
      return { otp: result.otp };
    }
    return {};
  }

  async verifyDeletionOtp(dto: VerifyDeletionOtpDto): Promise<void> {
    // Find user
    const user = await this.userRepository.findByEmail(dto.email as string);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if account is already deleted
    if (user.isDeleted) {
      throw new BadRequestException('Account already deleted');
    }

    // Check if deletion is already scheduled
    if (user.deletionScheduledAt) {
      const now = new Date();
      const daysRemaining = Math.ceil(
        (user.deletionScheduledAt.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysRemaining > 0) {
        throw new BadRequestException(
          `Account deletion already scheduled. ${daysRemaining} days remaining in grace period.`,
        );
      }
      throw new BadRequestException('Account deletion period has expired');
    }

    // Validate the OTP
    await this.validateOtp(user.id, dto.otp as string, 'DELETE_ACCOUNT');

    // Schedule deletion
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 30);

    await this.userRepository.updateDeletionSchedule(user.id, scheduledAt);
  }

  // ---------- RECOVER ACCOUNT ----------
  async initiateRecovery(
    email: string,
    password: string,
  ): Promise<{ otp?: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    if (!user.deletionScheduledAt)
      throw new BadRequestException('Account is not scheduled for deletion');

    if (!user.password)
      throw new BadRequestException('OAuth users cannot recover via password.');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid password');

    const result = await this.authOtpQueueService.addRecoverAccountOtpJob({
      userId: user.id,
      email: user.email,
    });

    if (process.env.NODE_ENV === 'development') {
      return { otp: result.otp };
    }
    return {};
  }

  async verifyRecoveryOtp(dto: RecoverAccountVerifyDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email as string);
    if (!user) throw new BadRequestException('User not found');
    await this.validateOtp(user.id, dto.otp as string, 'RECOVER_ACCOUNT');
    await this.userRepository.clearDeletionSchedule(user.id);
  }

  // ---------- LOGOUT ----------
  async logout(userId: string): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, null);
  }

  // ---------- GOOGLE AUTH ----------
  getGoogleAuthUrl(): string {
    return this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      prompt: 'select_account',
    });
  }

  async validateGoogleLogin(profile: any) {
    const { email, name, googleId } = profile;

    let user = await this.userRepository.findByEmail(email);

    if (user) {
      if (!user.googleId) {
        user = await this.userRepository.update(user.id, {
          googleId,
          provider: 'GOOGLE',
        });
      }
    } else {
      const userProps: UserProps = {
        id: uuidv4(),
        email,
        name,
        password: null,
        googleId,
        provider: 'GOOGLE',
        isEmailVerified: false,
        isDeleted: false,
        deletionScheduledAt: null,
        deletionReason: null,
        refreshToken: null,
        permissions: [],
        fcm_token: null,
        platform: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newUser = new User(userProps);
      user = await this.userRepository.create(newUser, 'USER');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role.name);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user,
      tokens,
    };
  }

  async getDeletionStatus(userId: string): Promise<DeletionStatusDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already deleted
    if (user.isDeleted) {
      return {
        isScheduled: false,
        status: 'DELETED',
        message: 'Your account has been permanently deleted.',
      };
    }

    // Check if deletion is scheduled
    if (!user.deletionScheduledAt) {
      return {
        isScheduled: false,
        status: 'NOT_SCHEDULED',
        message: 'Account deletion is not scheduled.',
      };
    }

    const now = new Date();
    const scheduledDate = new Date(user.deletionScheduledAt);
    const daysRemaining = Math.ceil(
      (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate days elapsed since scheduling
    const startDate = user.updatedAt || user.createdAt || now;
    const daysElapsed = Math.ceil(
      (now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining <= 0) {
      // Should have been deleted by cron, but just in case
      return {
        isScheduled: false,
        status: 'DELETED',
        message: 'Your account has been permanently deleted.',
      };
    }

    return {
      isScheduled: true,
      daysRemaining,
      scheduledDate,
      status: 'GRACE_PERIOD',
      daysElapsed: Math.min(daysElapsed, 30),
      scheduledAt: new Date(now.getTime() - daysElapsed * 24 * 60 * 60 * 1000),
      deletionDate: scheduledDate,
      message: `Account is in grace period. You have ${daysRemaining} days to recover.`,
    };
  }

  // ---------- CURRENT USER ----------
  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findLoginUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const role = user.role?.name;
    const baseResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      emailVerified: user.isEmailVerified,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (role === 'USER' && user.customer) {
      return {
        ...baseResponse,
        userType: 'CUSTOMER',
        phoneNumber: user.customer.phoneNumber || null,
        location: {
          latitude: user.customer.latitude || null,
          longitude: user.customer.longitude || null,
          hasLocation: !!(user.customer.latitude && user.customer.longitude),
        },
        profile: {
          id: user.customer.id,
          phoneNumber: user.customer.phoneNumber,
          dateOfBirth: user.customer.dateOfBirth,
          address: user.customer.address,
          avatar: user.customer.avatar,
          isActive: user.customer.isActive,
          preferredRadius: user.customer.preferredRadius,
        },
      };
    }

    if (role === 'VENDOR' && user.vendorStore) {
      const subscription = await this.userRepository.getVendorSubscription(
        user.vendorStore.id,
      );

      return {
        ...baseResponse,
        userType: 'VENDOR',
        phoneNumber: user.vendorStore.contactNumber || null,
        location: {
          latitude: user.vendorStore.serviceArea?.latitude || null,
          longitude: user.vendorStore.serviceArea?.longitude || null,
          hasLocation: !!(
            user.vendorStore.serviceArea?.latitude &&
            user.vendorStore.serviceArea?.longitude
          ),
          address: user.vendorStore.serviceArea?.address || null,
          radius: user.vendorStore.serviceArea?.radius || null,
        },
        profile: {
          id: user.vendorStore.id,
          vendorCode: user.vendorStore.vendorCode,
          businessName: user.vendorStore.businessName,
          publicEmail: user.vendorStore.publicEmail,
          contactNumber: user.vendorStore.contactNumber,
          bio: user.vendorStore.bio,
          coverImage: user.vendorStore.coverImage,
          onboardingStep: user.vendorStore.onboardingStep,
          kycStatus: user.vendorStore.kycStatus,
          status: user.vendorStore.status,
          adminStatus: user.vendorStore.adminStatus,
          truckReviewAverage: user.vendorStore.truckReviewAverage,
          truckReviewCount: user.vendorStore.truckReviewCount,
        },
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              isActive: subscription.isActive,
              isTrialPeriod: subscription.isTrialPeriod,
              autoRenew: subscription.autoRenew,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              expiresAt: subscription.expiresAt,
              lastRenewalDate: subscription.lastRenewalDate,
              cancellationDate: subscription.cancellationDate,
              revenueCatAppUserId: subscription.revenueCatAppUserId,
              entitlementId: subscription.entitlementId,
              productId: subscription.productId,
              store: subscription.store,
              provider: subscription.provider,
              plan: subscription.subscriptionPlan
                ? {
                    id: subscription.subscriptionPlan.id,
                    name: subscription.subscriptionPlan.name,
                    code: subscription.subscriptionPlan.code,
                    durationDays: subscription.subscriptionPlan.durationDays,
                    maxProducts: subscription.subscriptionPlan.maxProducts,
                    price: subscription.subscriptionPlan.price,
                    currency: subscription.subscriptionPlan.currency,
                    revenueCatEntitlementId:
                      subscription.subscriptionPlan.revenueCatEntitlementId,
                  }
                : null,
            }
          : null,
      };
    }

    return { ...baseResponse, userType: role || 'UNKNOWN' };
  }
}
