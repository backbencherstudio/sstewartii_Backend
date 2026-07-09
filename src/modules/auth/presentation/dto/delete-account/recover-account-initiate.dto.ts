import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class RecoverAccountInitiateDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the account to recover',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string | undefined;

  @ApiProperty({
    example: 'MyPassword123!',
    description: 'Password for verification (required for local accounts)',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;
}
