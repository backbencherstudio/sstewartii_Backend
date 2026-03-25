import { Injectable, Inject, ConflictException, UnauthorizedException, BadRequestException, ForbiddenException  } from '@nestjs/common';
import type { IUserRepository } from '../domain/interfaces/user.repository.interface';
import type { IOtpRepository } from '../domain/interfaces/otp.repository.interface';
import { User } from '../domain/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from '../presentation/dto/registerDto/register.dto';
import { LoginDto } from '../presentation/dto/loginDto/login.dto';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import { MailService } from '../infrastructure/services/mail.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('IOtpRepository') private readonly otpRepository: IOtpRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    
  ) {
     this.googleClient = new OAuth2Client(
     this.configService.get<string>('google.clientId'),
     this.configService.get<string>('google.clientSecret'),
     this.configService.get<string>('google.callbackUrl')
    );
  }

  private async generateAndSendOtp(user: User, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.create(user.id, hashedOtp, type, expiresAt);

    const purpose = type === 'EMAIL_VERIFICATION' ? 'Verification' : 'Password Reset';
    await this.mailService.sendOtpEmail(user.email, otp, purpose);
  }

  async requestEmailVerification(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    await this.generateAndSendOtp(user, 'EMAIL_VERIFICATION');
    return { message: 'Verification OTP sent to your email.' };
  }

  getGoogleAuthUrl(): string {
    const url = this.googleClient.generateAuthUrl({
      access_type: 'offline', 
      scope: ['email', 'profile'],
      prompt: 'consent'
    });

    return url;
  }

  async validateGoogleLogin(profile: any) {

    const { email, googleId } = profile;

    let user = await this.userRepository.findByEmail(email);

    if (user) {
    
      if (!user.googleId) {
         await this.userRepository.update(user.id, { googleId, provider: 'GOOGLE' });
      }
    } else {

      const newUser = new User({
        id: uuidv4(),
        email: email,
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

  async register(registerDto: RegisterDto) {
    
    const { email, password, confirmPassword, accountType  } = registerDto;

    if(password !== confirmPassword){
      throw new BadRequestException;
    }

    const existingUser = await this.userRepository.findByEmail(email);
   
    if (existingUser){
      throw new ConflictException('Email already exist');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      id: uuidv4(),
      email: email,
      password: hashedPassword,
    });

    const roleType = accountType === 'VENDOR' ? 'VENDOR' : 'USER';

    const savedUser = await this.userRepository.create(newUser, roleType);

    return {
      message: 'Registration Successfull',
      data: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role?.name,
      }
    };
  }

  private async getTokens(userId: string, email: string, roleName: string) {

    const jwtPayload = { sub: userId, email, roleName };

    const[accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1h',
      }),

      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '1d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.updateRefreshToken(userId, hash);
  }

  async login(loginDto: LoginDto){

    const { email, password } = loginDto;
    const user = await this.userRepository.findByEmail(email);

    if(!user){
      throw new ConflictException('Invalid Creadential');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid){
      throw new UnauthorizedException('Invalid Creadential')
    }

    const token = await this.getTokens(user.id, user.email, user.role.name);

    await this.updateRefreshTokenHash(user.id, token.refreshToken);
    
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
        },
      },
    };
    
  }

  async refreshToken(userId: string, refreshToken: string){

    const user = await this.userRepository.findById(userId);

    if (!user) throw new ForbiddenException('Access Denied');
    
    const storeRefreshTokenHash = await this.userRepository.getRefreshToken(userId);

    if (!storeRefreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, storeRefreshTokenHash);

    if (!isRefreshTokenValid){
      throw new ForbiddenException('Access Denied');
    }

    const token = await this.getTokens(user.id, user.email, user.role.name);

    await this.updateRefreshTokenHash(user.id, token.refreshToken);

    return token;
  }

}

