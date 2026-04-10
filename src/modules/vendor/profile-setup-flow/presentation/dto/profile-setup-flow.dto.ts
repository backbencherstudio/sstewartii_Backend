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
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';


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