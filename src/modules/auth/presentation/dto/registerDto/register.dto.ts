import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
