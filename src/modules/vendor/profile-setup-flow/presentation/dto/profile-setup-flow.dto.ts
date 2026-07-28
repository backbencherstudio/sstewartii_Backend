import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsArray,
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
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';

import { Type, Transform, plainToInstance } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLinkDto {
  @IsString()
  url!: string;
}

export class SetupProfileDto {
  @ApiProperty({
    description: 'Business name',
    required: false,
    example: 'Taco Paradise Food Truck',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({
    description: 'Public email',
    required: false,
    example: 'tacoparadise@example.com',
  })
  @IsOptional()
  @IsEmail()
  publicEmail?: string;

  @ApiProperty({
    description: 'Contact number',
    required: false,
    example: '+9876543210',
  })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiProperty({
    description: 'Bio description',
    required: false,
    example:
      'Authentic Mexican street food made with love and fresh ingredients.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: 'Array of cuisine IDs',
    type: [String],
    required: false,
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        if (value.includes(',')) {
          return value
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsOptional()
  @IsArray({ message: 'cuisineIds must be an array' })
  @ValidateIf(
    (o) =>
      o.cuisineIds !== undefined &&
      o.cuisineIds !== null &&
      o.cuisineIds.length > 0,
  )
  @ArrayNotEmpty({ message: 'cuisineIds should not be empty if provided' })
  @IsUUID('4', {
    each: true,
    message: 'each value in cuisineIds must be a UUID',
  })
  cuisineIds?: string[];

  @ApiProperty({
    description: 'Social links',
    type: [SocialLinkDto],
    required: false,
    example: [{ url: 'https://instagram.com/tacoparadise' }],
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        const arr = JSON.parse(value);
        return arr.map((item: any) => plainToInstance(SocialLinkDto, item));
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value.map((item: any) => plainToInstance(SocialLinkDto, item));
    }
    return [];
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}

export class SetupCuisineDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class OperationHourDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ required: false, example: '09:00' })
  @ValidateIf((o) => !o.isClosed)
  @IsString()
  @IsNotEmpty()
  openTime?: string;

  @ApiProperty({ required: false, example: '22:00' })
  @ValidateIf((o) => !o.isClosed)
  @IsString()
  @IsNotEmpty()
  closeTime?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  activeTo?: string;

  @ApiProperty({ required: false, minimum: 0, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class UpsertOperationHoursDto {
  @ApiProperty({ type: [OperationHourDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationHourDto)
  hours!: OperationHourDto[];
}

export class ServiceAreaDto {
  @ApiProperty({ example: 34.0522 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -118.2437 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ required: false, example: 'Los Angeles, CA' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 10, minimum: 0.1 })
  @IsNumber()
  @Min(0.1)
  radius!: number;
}

export class UpdateServiceAreaDto extends PartialType(ServiceAreaDto) {
  radius?: never;

  @ApiProperty({ required: false, example: 34.0522 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false, example: -118.2437 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false, example: 'Los Angeles, California' })
  @IsOptional()
  @IsString()
  address?: string;

  @ValidateIf((o) => !o.latitude && !o.longitude && !o.address)
  validateAtLeastOne() {
    throw new Error('At least one field must be provided');
  }
}

export class CreateCuisineDto {
  @ApiProperty({ example: 'Mexican', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
