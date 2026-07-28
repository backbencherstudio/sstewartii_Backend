import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import type { AuthUser } from '../domain/interfaces/auth-user.interface';

import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';

import { RegisterDto } from './dto/registerDto/register.dto';
import { LoginDto } from './dto/loginDto/login.dto';
import { SendOtpDto, VerifyOtpDto, NewPasswordDto } from './dto/mail/otp.dto';

// Import new DTOs
import { RequestDeletionDto } from './dto/delete-account/request-deletion.dto';
import { VerifyDeletionOtpDto } from './dto/delete-account/verify-deletion-otp.dto';
import { RecoverAccountVerifyDto } from './dto/delete-account/recover-account-verify.dto';

import { AuthService } from '../application/auth.service';
import { FirebaseAuthService } from '../application/firebase-auth.service';
import { GoogleOAuthGuard } from 'src/common/guards/google-oauth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { CurrentUser } from '../decorators/get-user.decorator';
import { ChangePasswordDto } from './dto/change-password/change-password.dto';
import { RecoverAccountInitiateDto } from './dto/delete-account/recover-account-initiate.dto';
import { DeletionStatusDto } from './dto/delete-account/deletion-status.dto';
import { FirebaseLoginDto } from './dto/loginDto/firebase-login.dto';


export class FirebaseCodeLoginDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  code: string | undefined;

  @ApiProperty({ description: 'Redirect URI for OAuth flow', required: false })
  redirectUri?: string;

  constructor(partial?: Partial<FirebaseCodeLoginDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ============ REGULAR AUTH ENDPOINTS ============

  @Post('register')
  @Public()
  @ResponseMessage('Registration Successfull.')
  @ApiOperation({ summary: 'Registration' })
  @ApiResponse({ status: 201, description: 'Registration Successfull' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @ResponseMessage('Login Succesful')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.authService.login(loginDto);
    const refreshToken = response.data.refreshToken;

    res.cookie('refreshToken', response.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      message: response.message,
      data: {
        accessToken: response.data.accessToken,
        refreshToken: refreshToken,
        user: response.data.user,
        deletionInfo: response.data.deletionInfo || null,
      },
    };
  }

  @Get('google/url')
  @Public()
  googleAuth() {
    return {
      url: this.authService.getGoogleAuthUrl(),
    };
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req, @Res() res: Response) {
    const { tokens } = await this.authService.validateGoogleLogin(req.user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = this.configService.getOrThrow<string>(
      'redirect_url.frontEndRedirect',
    );

    return res.redirect(`${frontendUrl}?token=${tokens.accessToken}`);
  }

  // ============ FIREBASE AUTH ENDPOINTS ============

  /**
   * Firebase Google Login with ID Token (Recommended for Mobile)
   * Client should get ID token from Firebase SDK and send it here
   */
  @Post('google-firebase/login')
  @Public()
  @ResponseMessage('Google login successful')
  @ApiOperation({
    summary: 'Login with Google using Firebase ID token (Mobile)',
  })
  @ApiBody({ type: FirebaseLoginDto })
  async googleFirebaseLogin(
    @Body() firebaseLoginDto: FirebaseLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { idToken, fcmToken, platform, role } = firebaseLoginDto;

    const result = await this.firebaseAuthService.handleFirebaseLogin(
      idToken,
      'google',
      { fcmToken, platform, role },
    );

    // Set refresh token cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Google login successful',
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          isVerified: result.user.isEmailVerified,
          provider: result.user.provider,
        },
      },
    };
  }

  /**
   * Firebase Apple Login with ID Token (Recommended for Mobile)
   * Client should get ID token from Firebase SDK and send it here
   */
  @Post('apple-firebase/login')
  @Public()
  @ResponseMessage('Apple login successful')
  @ApiOperation({
    summary: 'Login with Apple using Firebase ID token (Mobile)',
  })
  @ApiBody({ type: FirebaseLoginDto })
  @ApiResponse({ status: 200, description: 'Apple login successful' })
  @ApiResponse({ status: 401, description: 'Invalid Firebase token' })
  async appleFirebaseLogin(
    @Body() firebaseLoginDto: FirebaseLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { idToken, fcmToken, platform, role } = firebaseLoginDto;

    if (!idToken) {
      throw new BadRequestException('ID token is required');
    }

    const result = await this.firebaseAuthService.handleFirebaseLogin(
      idToken,
      'apple',
      { fcmToken, platform, role },
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Apple login successful',
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          isVerified: result.user.isEmailVerified,
          provider: result.user.provider,
        },
      },
    };
  }

  /**
   * Firebase Google Login with Authorization Code (For Web OAuth Flow)
   * Use this for web OAuth redirect flow
   * FIXED: Moved @Res before optional parameters
   */
  @Post('google-firebase/code')
  @Public()
  @ResponseMessage('Google login successful')
  @ApiOperation({ summary: 'Login with Google using authorization code (Web)' })
  @ApiBody({ type: FirebaseCodeLoginDto })
  @ApiResponse({ status: 200, description: 'Google login successful' })
  async googleFirebaseCodeLogin(
    @Res({ passthrough: true }) res: Response,
    @Body('code') code: string,
    @Body('redirectUri') redirectUri?: string,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    const result = await this.firebaseAuthService.handleFirebaseCodeLogin(
      code,
      'google',
      redirectUri,
    );

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Google login successful',
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role?.name,
          isVerified: result.user.isEmailVerified,
          provider: result.user.provider,
        },
      },
    };
  }

  /**
   * Firebase Apple Login with Authorization Code (For Web OAuth Flow)
   * Use this for web OAuth redirect flow
   * FIXED: Moved @Res before optional parameters
   */
  @Post('apple-firebase/code')
  @Public()
  @ResponseMessage('Apple login successful')
  @ApiOperation({ summary: 'Login with Apple using authorization code (Web)' })
  @ApiBody({ type: FirebaseCodeLoginDto })
  @ApiResponse({ status: 200, description: 'Apple login successful' })
  async appleFirebaseCodeLogin(
    @Res({ passthrough: true }) res: Response,
    @Body('code') code: string,
    @Body('redirectUri') redirectUri?: string,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    const result = await this.firebaseAuthService.handleFirebaseCodeLogin(
      code,
      'apple',
      redirectUri,
    );

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Apple login successful',
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role?.name,
          isVerified: result.user.isEmailVerified,
          provider: result.user.provider,
        },
      },
    };
  }

  /**
   * Get Google OAuth URL for Firebase (Web)
   */
  @Get('google-firebase/url')
  @Public()
  @ApiOperation({ summary: 'Get Google OAuth URL for Firebase' })
  getGoogleFirebaseAuthUrl() {
    const url = this.firebaseAuthService.getGoogleAuthUrl();
    return { url };
  }

  /**
   * Get Apple OAuth URL for Firebase (Web)
   */
  @Get('apple-firebase/url')
  @Public()
  @ApiOperation({ summary: 'Get Apple OAuth URL for Firebase' })
  getAppleFirebaseAuthUrl() {
    const url = this.firebaseAuthService.getAppleAuthUrl();
    return { url };
  }

  // ============ EXISTING AUTH ENDPOINTS ============

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('refresh')
  @Public()
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'] || req.body.refreshToken;

    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const tokens = await this.authService.refreshToken(
      payload.sub,
      refreshToken,
    );

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @Post('send-verification')
  @Public()
  @ResponseMessage('Verification OTP sent to your email.')
  async sendVerificationEmail(@Body() dto: SendOtpDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @Post('verify-otp')
  @Public()
  @ResponseMessage('Otp Verification Success')
  async verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @Public()
  @ResponseMessage('If your email is registered, a reset code has been sent.')
  async forgotPassword(@Body() dto: SendOtpDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-reset-otp')
  @Public()
  @ResponseMessage('OTP verified. You may now change your password.')
  async verifyResetOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  @Post('reset-password')
  @Public()
  @ResponseMessage('Password changed successfully.')
  async resetPassword(
    @Body('resetToken') resetToken: string,
    @Body() dto: NewPasswordDto,
  ) {
    await this.authService.resetPasswordWithToken(resetToken, dto.newPassword);
    return null;
  }

  // ---------- CHANGE PASSWORD ----------
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ResponseMessage('Password changed successfully.')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword as string,
      dto.newPassword as string,
      dto.confirmNewPassword as string,
    );
    return { message: 'Password changed successfully' };
  }

  // ---------- DELETE ACCOUNT ----------
  @UseGuards(JwtAuthGuard)
  @Post('delete-account/request')
  @ResponseMessage('OTP sent to your email for deletion confirmation.')
  @ApiOperation({ summary: 'Request account deletion (requires password)' })
  async requestDeletion(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestDeletionDto,
  ) {
    if (!dto.password) {
      throw new UnauthorizedException(
        'Password is required for account deletion',
      );
    }
    const result = await this.authService.requestDeletion(
      user.id,
      dto.password,
      dto.reason,
    );

    return {
      message: 'OTP sent to your email.',
      ...(result?.otp && {
        otp: result.otp,
        note: 'Development mode - OTP returned for testing',
      }),
    };
  }

  @Public()
  @Post('delete-account/verify')
  @ResponseMessage('Account deletion scheduled. You have 30 days to cancel.')
  @ApiOperation({ summary: 'Verify OTP to schedule deletion' })
  async verifyDeletionOtp(@Body() dto: VerifyDeletionOtpDto) {
    await this.authService.verifyDeletionOtp(dto);
    return { message: 'Deletion scheduled for 30 days from now.' };
  }

  // ---------- RECOVER ACCOUNT ----------
  @Public()
  @Post('recover-account/initiate')
  @ResponseMessage('OTP sent to your email for account recovery.')
  @ApiOperation({ summary: 'Initiate account recovery (requires password)' })
  async initiateRecovery(@Body() dto: RecoverAccountInitiateDto) {
    if (!dto.password) {
      throw new BadRequestException(
        'Password is required for account recovery',
      );
    }
    const result = await this.authService.initiateRecovery(
      dto.email as string,
      dto.password,
    );

    return {
      message: 'OTP sent to your email.',
      ...(result?.otp && {
        otp: result.otp,
        note: 'Development mode - OTP returned for testing',
      }),
    };
  }

  @Public()
  @Post('recover-account/verify')
  @ResponseMessage('Account recovery successful. Deletion cancelled.')
  @ApiOperation({ summary: 'Verify OTP to recover account' })
  async verifyRecoveryOtp(@Body() dto: RecoverAccountVerifyDto) {
    await this.authService.verifyRecoveryOtp(dto);
    return { message: 'Account recovered successfully.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('delete-account/status')
  @ApiOperation({ summary: 'Get account deletion status' })
  @ApiResponse({
    status: 200,
    description: 'Returns deletion status',
    type: DeletionStatusDto,
  })
  async getDeletionStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<DeletionStatusDto> {
    return this.authService.getDeletionStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ResponseMessage('Logged out successfully.')
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    const userId = user.id;
    await this.authService.logout(userId);
  }
}
