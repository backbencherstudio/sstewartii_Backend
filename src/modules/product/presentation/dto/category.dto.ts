import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CategorySearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyword?: string;
}
