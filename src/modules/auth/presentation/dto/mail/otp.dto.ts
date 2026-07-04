import {
  IsEmail,
  IsString,
  Length,
  IsNotEmpty,
  MinLength,
  IsJWT,
} from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';

export class SendOtpDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}

export class NewPasswordDto {
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsJWT({ message: 'Invalid reset session. Please start over.' })
  resetToken!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @Match('newPassword', { message: 'Confirmation password does not match' })
  confirmPassword!: string;
}
