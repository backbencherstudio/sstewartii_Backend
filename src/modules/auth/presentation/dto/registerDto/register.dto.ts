import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';

export enum AccountType {
  USER = 'USER',
  VENDOR = 'VENDOR',
}

export class RegisterDto {
  @IsString()
  @ApiProperty({ example: 'sahadat' })
  name!: string;

  @IsEmail({}, { message: 'Please Valid Email' })
  @ApiProperty({ example: 'sahadat@gmail.com' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @ApiProperty({ example: '123456' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123456' })
  confirmPassword!: string;

  @IsEnum(AccountType, { message: 'accountType must be USER or VENDOR' })
  @ApiProperty({ example: 'VENDOR' })
  accountType!: AccountType;

  @ApiProperty({ required: false, example: 'fcm_token_here' })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiProperty({ required: false, enum: DevicePlatform, example: 'IOS' })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}

export class UpdateAdminProfileDto {
  @ApiProperty({
    description: 'Admin name',
    required: false,
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description: 'Admin avatar file (image)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  avatar?: any; // This will be handled by multer
}