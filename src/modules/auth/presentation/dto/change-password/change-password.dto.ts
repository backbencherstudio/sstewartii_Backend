import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  @MinLength(8)
  currentPassword: string | undefined;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    },
  )
  newPassword: string | undefined;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  confirmNewPassword: string | undefined;
}
