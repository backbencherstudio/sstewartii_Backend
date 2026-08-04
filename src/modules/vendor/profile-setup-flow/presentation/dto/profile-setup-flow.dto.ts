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
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
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
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'openTime must be in HH:MM format (e.g., 09:00)',
  })
  openTime?: string;

  @ApiProperty({ required: false, example: '22:00' })
  @ValidateIf((o) => !o.isClosed)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'closeTime must be in HH:MM format (e.g., 22:00)',
  })
  closeTime?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed!: boolean;

  @ApiProperty({
    required: false,
    description: 'Start date for this schedule (defaults to now)',
    example: '2025-06-03T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @ApiProperty({
    required: false,
    description: 'End date for this schedule (null = forever)',
    example: null,
  })
  @IsOptional()
  @IsDateString()
  activeTo?: string | null;

  @ApiProperty({
    required: false,
    minimum: 0,
    example: 0,
    description: 'Priority (higher = more important)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  // ============================================
  // NEW: Leaving Soon Feature
  // ============================================

  @ApiProperty({
    required: false,
    default: true,
    description: 'Enable leaving soon notification for this day',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  leavingSoonEnabled?: boolean;

  @ApiProperty({
    required: false,
    default: 30,
    minimum: 1,
    maximum: 120,
    description: 'Minutes before closing to notify customers (1-120 minutes)',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  leavingSoonMinutes?: number;

  @ApiProperty({
    required: false,
    description: 'Custom leaving time in HH:MM:SS format',
    example: '00:30:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/, {
    message: 'customLeavingTime must be in HH:MM:SS format (e.g., 00:30:00)',
  })
  customLeavingTime?: string;
}

export class UpsertOperationHoursDto {
  @ApiProperty({
    type: [OperationHourDto],
    description: 'Array of operation hours for each day of the week',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationHourDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  hours!: OperationHourDto[];

  @ApiProperty({
    required: false,
    description: 'Global active period start date',
    example: '2025-06-03T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  activePeriodStart?: string;

  @ApiProperty({
    required: false,
    description: 'Global active period end date (null = forever)',
    example: null,
  })
  @IsOptional()
  @IsDateString()
  activePeriodEnd?: string | null;
}

// ============================================
// NEW DTO: Set Leaving Time
// ============================================

export class SetLeavingTimeDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
    minimum: 0,
    maximum: 6,
    example: 0,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Leaving time in HH:MM:SS format',
    example: '00:30:00',
    enum: [
      '00:29:00',
      '00:30:00',
      '00:31:00',
      '00:32:00',
      '00:33:00',
      '00:34:00',
      '00:35:00',
      '00:36:00',
      '00:37:00',
      '00:38:00',
      '00:39:00',
      '00:40:00',
      // ... up to 05:30:00
    ],
  })
  @IsString()
  @Matches(/^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/, {
    message: 'leavingTime must be in HH:MM:SS format (e.g., 00:30:00)',
  })
  leavingTime!: string;

  @ApiProperty({
    required: false,
    default: true,
    description: 'Enable leaving soon notification',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

// ============================================
// NEW DTO: Update Leaving Minutes
// ============================================

export class UpdateLeavingMinutesDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 6 = Saturday)',
    minimum: 0,
    maximum: 6,
    example: 0,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Minutes before closing to notify customers (1-120 minutes)',
    minimum: 1,
    maximum: 120,
    example: 30,
  })
  @IsInt()
  @Min(1)
  @Max(120)
  leavingSoonMinutes!: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class OperationHourResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  vendorId!: string;

  @ApiProperty({ description: 'Day of week (0 = Sunday, 6 = Saturday)' })
  dayOfWeek!: number;

  @ApiProperty({ nullable: true })
  openTime!: string | null;

  @ApiProperty({ nullable: true })
  closeTime!: string | null;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  activeFrom!: Date;

  @ApiProperty({ nullable: true })
  activeTo!: Date | null;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  leavingSoonEnabled!: boolean;

  @ApiProperty()
  leavingSoonMinutes!: number;

  @ApiProperty({ nullable: true })
  customLeavingTime!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
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
