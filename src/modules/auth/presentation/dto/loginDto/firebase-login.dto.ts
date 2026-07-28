import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { DevicePlatform } from '@prisma/client';

// Define allowed roles – adjust to your actual Role enum or list
export enum UserRole {
  USER = 'USER',
  VENDOR = 'VENDOR',
}

export class FirebaseLoginDto {
  @ApiProperty({ example: 'firebase_id_token_here' })
  @IsString()
  @IsNotEmpty({ message: 'Firebase ID token is required' })
  idToken!: string;

  @ApiProperty({ required: false, example: 'fcm_token_here' })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiProperty({ required: false, enum: DevicePlatform, example: 'IOS' })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @ApiProperty({ required: false, enum: UserRole, example: 'ARTIST' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
