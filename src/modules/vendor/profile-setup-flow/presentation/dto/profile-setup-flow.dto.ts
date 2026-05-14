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
  MinLength,
  MaxLength,
 } from 'class-validator';

import { Type, Transform, plainToInstance  } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLinkDto {
  @IsString()
  url!: string;
}

export class SetupCuisineDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class SetupProfileDto {
  @IsString()
  businessName!: string;

  @IsEmail()
  publicEmail!: string;

  @IsString()
  contactNumber!: string;

  @IsString()
  bio!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetupCuisineDto)
  @Transform(({ value }) => {
    const arr = typeof value === 'string' ? JSON.parse(value) : value;
    return arr.map((item: any) => {
      if (typeof item === 'string') {
        return plainToInstance(SetupCuisineDto, {
          name: item,
        });
      }

      return plainToInstance(SetupCuisineDto, item);
    });
  })
  cuisines!: SetupCuisineDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  @Transform(({ value }) => {
    if (!value) return undefined;

    const arr = typeof value === 'string' ? JSON.parse(value) : value;

    return arr.map((item: any) =>
      plainToInstance(SocialLinkDto, item),
    );
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

export class UpdateServiceAreaDto extends PartialType(ServiceAreaDto) {
  
  radius?: never; 

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '34.0522' })
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '-118.2437' })
  longitude?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Angeles, California, 3525 Hillhaven Drive' })
  address?: string;

  @ValidateIf(o => !o.latitude && !o.longitude && !o.address)
  validateAtLeastOne() {
    throw new Error('At least one field must be provided');
  } 
}

export class CreateCuisineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}