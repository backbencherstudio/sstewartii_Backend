import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export enum VendorVerificationSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class VendorVerificationListQueryDto {
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus = VerificationStatus.PENDING;

  @IsOptional()
  @IsEnum(VendorVerificationSort)
  sort?: VendorVerificationSort = VendorVerificationSort.NEWEST;

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
  limit?: number = 10;
}