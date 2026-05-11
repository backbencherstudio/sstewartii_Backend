import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHelpTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  message!: string;
}