import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';

export enum AccountType {
  USER = 'USER',
  VENDOR = 'VENDOR',
}

export class RegisterDto {
    
    @IsString()
    name!: string;

    @IsEmail({}, { message: 'Please Valid Email' })
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password!: string;

    @IsString()
    @IsNotEmpty()
    confirmPassword!: string;

    @IsEnum(AccountType, { message: 'accountType must be USER or VENDOR' })
    accountType!: AccountType;
}
