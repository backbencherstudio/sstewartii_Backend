import {
  IsString, 
  IsNumber,
  IsEmail, 
  IsOptional, 
  IsArray, 
  IsUrl, 
  ValidateNested,
  IsInt, 
  Min, 
  Max, 
  IsBoolean, 
  IsDateString, 
  ValidateIf,
  IsNotEmpty,
 } from 'class-validator';
import { Type, Transform, plainToInstance  } from 'class-transformer';

export class SocialLinkDto {
  @IsUrl() url!: string;
}

export class SetupProfileDto {
  @IsString() businessName!: string;
  @IsEmail() publicEmail!: string;
  @IsString() contactNumber!: string;
  @IsString() bio!: string;

  @IsArray()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  cuisines!: string[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  
   @Transform(({ value }) => {
    const arr = typeof value === 'string' ? JSON.parse(value) : value;
    return arr.map((item: any) => plainToInstance(SocialLinkDto, item));
  })
  socialLinks?: SocialLinkDto[];
}

export class OperationHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ValidateIf((o) => !o.isClosed)
  @IsString()
  @IsNotEmpty()
  openTime?: string;

  @ValidateIf((o) => !o.isClosed)
  @IsString()
  @IsNotEmpty()
  closeTime?: string;

  @IsBoolean()
  isClosed!: boolean;

  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @IsOptional()
  @IsDateString()
  activeTo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class UpsertOperationHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationHourDto)
  hours!: OperationHourDto[];
}

export class ServiceAreaDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  @Min(0.1)
  radius!: number;
}