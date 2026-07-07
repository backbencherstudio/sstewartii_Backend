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
} from '@nestjs/common';

import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import type { IUserRepository } from '../domain/interfaces/user.repository.interface';
import type { IOtpRepository } from '../domain/interfaces/otp.repository.interface';
import { User } from '../domain/entities/user.entity';

import { AuthOtpQueueService } from '../infrastructure/queues/auth-otp-queue.service';

import { RegisterDto } from '../presentation/dto/registerDto/register.dto';
import { LoginDto } from '../presentation/dto/loginDto/login.dto';
import { MailService } from 'src/common/mail/mail.service';
import { VerifyOtpDto } from '../presentation/dto/mail/otp.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,

    @Inject('IOtpRepository')
    private readonly otpRepository: IOtpRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly authOtpQueueService: AuthOtpQueueService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      this.configService.get<string>('google.callbackUrl'),
    );
  }

  async register(registerDto: RegisterDto): Promise<any> {
    const { email, password, confirmPassword, accountType, name } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException();
    }

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exist');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      id: uuidv4(),
      email: email,
      password: hashedPassword,
      name: name,
    });

    const roleType = accountType === 'VENDOR' ? 'VENDOR' : 'USER';

    const savedUser = await this.userRepository.create(newUser, roleType);

    // await this.generateAndSendOtp(savedUser, 'EMAIL_VERIFICATION');

    await this.authOtpQueueService.addEmailVerificationOtpJob({
      userId: savedUser.id,
      email: savedUser.email,
    });

    return {
      message: 'Registration Successfull',
      data: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role?.name,
        isVerified: savedUser.isEmailVerified,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findLoginUserByEmail(email);

    if (!user) {
      throw new ConflictException({
        success: false,
        message: 'Invalid Creadential',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid Creadential',
      });
    }

    if (!user.isEmailVerified) {
      await this.authOtpQueueService.addEmailVerificationOtpJob({
        userId: user.id,
        email: user.email,
      });
    }

    const token = await this.getTokens(user.id, user.email, user.role.name);

    await this.updateRefreshTokenHash(user.id, token.refreshToken);

    const locationState = this.buildLocationState(user);

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

    return {
      hasLocation: false,
      locationRequired: false,
      nextStep: 'HOME',
    };
  }

  async refreshToken(userId: string, refreshToken: string): Promise<any> {
    const user = await this.userRepository.findById(userId);

    if (!user) throw new ForbiddenException('Access Denied');

    const storeRefreshTokenHash =
      await this.userRepository.getRefreshToken(userId);

    if (!storeRefreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      storeRefreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access Denied');
    }

    const token = await this.getTokens(user.id, user.email, user.role.name);

    await this.updateRefreshTokenHash(user.id, token.refreshToken);

    return token;
  }

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

  async validateGoogleLogin(profile: any): Promise<any> {
    const { email, name, googleId } = profile;

    let user = await this.userRepository.findByEmail(email);

    if (user) {
      if (!user.googleId) {
        await this.userRepository.update(user.id, {
          googleId,
          provider: 'GOOGLE',
        });
      }
    } else {
      const newUser = new User({
        id: uuidv4(),
        email: email,
        name: name,
        password: null,
        googleId: googleId,
        provider: 'GOOGLE',
      });

      const roleType = 'USER';

      user = await this.userRepository.create(newUser, roleType);
    }

    const tokens = await this.getTokens(user.id, user.email, user.role.name);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  getGoogleAuthUrl(): string {
    const url = this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      prompt: 'consent',
    });

    return url;
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.updateRefreshToken(userId, hash);
  }

  async requestEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) throw new BadRequestException('User not found');

    if (user.isEmailVerified)
      throw new BadRequestException('Email is already verified');

    await this.authOtpQueueService.addEmailVerificationOtpJob({
      userId: user.id,
      email: user.email,
    });

    //await this.generateAndSendOtp(user, 'EMAIL_VERIFICATION');
  }

  private async generateAndSendOtp(
    user: { id: string; email: string },
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.create(user.id, hashedOtp, type, expiresAt);

    const purpose =
      type === 'EMAIL_VERIFICATION' ? 'Verification' : 'Password Reset';

    await this.mailService.sendOtpEmail(user.email, otp, purpose);
  }

  async verifyEmail(dto: VerifyOtpDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid request');

    await this.validateOtp(user.id, dto.otp, 'EMAIL_VERIFICATION');

    await this.userRepository.update(user.id, { isEmailVerified: true });
  }

  private async validateOtp(
    userId: string,
    plainOtp: string,
    type: string,
  ): Promise<void> {
    const otpRecord = await this.otpRepository.findLatest(userId, type);

    if (!otpRecord) throw new BadRequestException('Invalid or expired OTP');

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    const isValid = await bcrypt.compare(plainOtp, otpRecord.otp);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    await this.otpRepository.deleteUserOtps(userId, type);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (user && user.provider === 'LOCAL') {
      await this.generateAndSendOtp(user, 'PASSWORD_RESET');
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

      if (payload.type !== 'PASSWORD_RESET_TOKEN') {
        throw new UnauthorizedException('Invalid token type');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.update(payload.sub, {
        password: hashedPassword,
        refreshToken: null,
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Reset session expired or invalid');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, null);
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findLoginUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = user.role?.name;

    // Base user information
    const baseResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: role,
      emailVerified: user.isEmailVerified,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // If user is a CUSTOMER
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

    // If user is a VENDOR
    if (role === 'VENDOR' && user.vendorStore) {
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
          subscriptionStatus: user.vendorStore.subscriptionStatus,
          status: user.vendorStore.status,
          adminStatus: user.vendorStore.adminStatus,
          truckReviewAverage: user.vendorStore.truckReviewAverage,
          truckReviewCount: user.vendorStore.truckReviewCount,
        },
      };
    }

    // If user is ADMIN or other role
    return {
      ...baseResponse,
      userType: role || 'UNKNOWN',
    };
  }
}
