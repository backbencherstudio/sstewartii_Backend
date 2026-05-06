import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VendorLiveStatus } from '@prisma/client';

export class VendorMenuQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UploadTruckGalleryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class VendorReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class UpdateVendorStatusDto {
  @IsEnum(VendorLiveStatus)
  status!: VendorLiveStatus;
}

export class VendorMenuItemsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20; 
}

  export class UpdateVendorMenuItemStatusDto {
  @IsBoolean()
  isActive!: boolean;
}