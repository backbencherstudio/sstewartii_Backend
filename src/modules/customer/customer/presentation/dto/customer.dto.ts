import {
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Max,
  Min,
  IsBoolean,
  IsIn,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

import { Type, Transform } from 'class-transformer';

export class SetCustomerLocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class NearbyVendorsQueryDto {
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
  @Max(50)
  limit?: number = 10;
}

export class TopPicksQueryDto {
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
  @Max(50)
  limit?: number = 10;
}

export class ExploreMapQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number = 10;

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

export class FoodFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number = 10;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  openNow?: boolean;

  @IsOptional()
  @IsIn([
    'recommended',
    'popular',
    'open_now',
    'close_by',
    'top_rated',
    'nearby',
    'price_low_to_high',
    'price_high_to_low',
  ])
  sortBy?:
    | 'recommended'
    | 'popular'
    | 'open_now'
    | 'close_by'
    | 'top_rated'
    | 'nearby'
    | 'price_low_to_high'
    | 'price_high_to_low';

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

export class FavoriteProductsQueryDto {
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
  @Max(50)
  limit?: number = 10;
}

export class FavoriteVendorsQueryDto {
  @IsOptional()
  @IsString()
  cuisine?: string;

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

export enum CustomerSearchType {
  FOOD = 'FOOD',
  TRUCK = 'TRUCK',
}

export enum CustomerSearchSortBy {
  RECOMMENDED = 'recommended',
  POPULAR = 'popular',
  OPEN_NOW = 'open_now',
  CLOSE_BY = 'close_by',
  TOP_RATED = 'top_rated',
  NEARBY = 'nearby',
  PRICE_LOW_TO_HIGH = 'price_low_to_high',
  PRICE_HIGH_TO_LOW = 'price_high_to_low',
}

export class CustomerAdvancedSearchQueryDto {
  @IsEnum(CustomerSearchType)
  type!: CustomerSearchType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number = 10;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openNow?: boolean;

  @IsOptional()
  @IsEnum(CustomerSearchSortBy)
  sortBy?: CustomerSearchSortBy = CustomerSearchSortBy.RECOMMENDED;

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

export enum OrderFilter {
  ALL = 'all',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class OrderHistoryQueryDto {
  @IsOptional()
  @IsEnum(OrderFilter)
  filter?: OrderFilter = OrderFilter.ALL;

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


export class OrderDetailQueryDto {
  @IsString()
  @IsNotEmpty()
  orderId: string | undefined;
}

export class OrderAgainDto {
  @IsString()
  @IsNotEmpty()
  orderId: string | undefined;
}