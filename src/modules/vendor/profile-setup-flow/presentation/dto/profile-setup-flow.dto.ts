import { IsString, IsEmail, IsOptional, IsArray, IsUrl, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SocialLinkDto {
  @IsString() platform: string;
  @IsUrl() url: string;
}

export class SetupProfileDto {
  @IsString() businessName: string;
  @IsEmail() publicEmail: string;
  @IsString() contactNumber: string;
  @IsString() bio: string;

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  cuisines: string[]; 
  
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  socialLinks?: SocialLinkDto[];
}