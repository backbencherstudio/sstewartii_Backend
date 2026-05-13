import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  IsBoolean,
  IsEnum,
  IsIn,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VendorLiveStatus } from '@prisma/client';

import { VendorInsightAccessDto } from './vendor-insights.response.dto';

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

export class VendorReviewsQueryDtoMe {
  @IsOptional()
  @IsIn(['MOST_RECENT', 'HIGHEST_RATED', 'LOWEST_RATED'])
  sort?: 'MOST_RECENT' | 'HIGHEST_RATED' | 'LOWEST_RATED' = 'MOST_RECENT';

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

export class VendorFollowersQueryDto {
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

export class VendorFollowerCustomerDto {
  id!: string;
  name!: string;
  avatar?: string;
}

export class VendorFollowerListItemDto {
  id!: string;

  customer!: VendorFollowerCustomerDto;

  followedAt!: Date;
  followerSinceLabel!: string;

  orderCount!: number;
  orderLabel!: string;
}

export class VendorFollowersResponseDto {
  access!: VendorInsightAccessDto;

  locked!: boolean;
  lockedMessage?: string;

  summary!: {
    totalFollowers: number;
    thisMonthFollowers: number;
    previousMonthFollowers: number;
    growthPercent: number;
    growthLabel: string;
  };

  pagination!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  followers!: VendorFollowerListItemDto[];
}