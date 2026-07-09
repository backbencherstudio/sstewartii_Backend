import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @ApiProperty({ required: false, example: 'fcm_token_here' })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiProperty({ required: false, enum: DevicePlatform, example: 'IOS' })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}
