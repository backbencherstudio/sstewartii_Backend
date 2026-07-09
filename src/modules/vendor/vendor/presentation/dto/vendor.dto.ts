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
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VendorLiveStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

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

export class DeleteTruckGalleryImagesDto {
  @ApiProperty({
    description: 'Array of image IDs to delete',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one image ID is required' })
  @ArrayMaxSize(50, { message: 'Cannot delete more than 50 images at once' })
  @IsUUID('4', { each: true, message: 'Each image ID must be a valid UUID' })
  imageIds!: string[];
}

export class UpdateTruckGalleryImageDto {
  @ApiProperty({
    description: 'ID of the image to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Image ID must be a valid UUID' })
  imageId!: string;

  @ApiProperty({
    description: 'New caption for the image',
    example: 'My updated truck photo',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Caption must be a string' })
  @MaxLength(255, { message: 'Caption cannot exceed 255 characters' })
  caption?: string;

  @ApiProperty({
    description: 'Set this image as primary',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary?: boolean;

  @ApiProperty({
    description: 'Position/order of the image',
    example: 0,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Position must be an integer' })
  @Min(0, { message: 'Position cannot be negative' })
  position?: number;
}
