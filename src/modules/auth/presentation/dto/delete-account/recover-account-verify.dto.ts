import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RecoverAccountVerifyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string | undefined;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string | undefined;
}
