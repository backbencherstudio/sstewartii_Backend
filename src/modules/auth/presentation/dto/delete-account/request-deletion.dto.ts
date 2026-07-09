import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RequestDeletionDto {
  @ApiProperty({ example: 'MyPassword123!' })
  @IsString()
  password: string | undefined;

  @ApiProperty({ required: false, example: 'No longer needed' })
  @IsString()
  @IsOptional()
  reason?: string;
}
