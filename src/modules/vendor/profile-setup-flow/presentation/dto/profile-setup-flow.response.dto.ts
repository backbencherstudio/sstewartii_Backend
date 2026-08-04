// src/modules/vendor/profile-setup-flow/presentation/dto/profile-setup-flow.response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

// ============================================
// CUISINE RESPONSE DTOs
// ============================================

export class CuisineResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  imageUrl?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class VendorProfileCuisineResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  imageUrl?: string;
}

// ============================================
// SOCIAL LINK RESPONSE DTOs
// ============================================

export class VendorProfileSocialLinkResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  url!: string | null;
}

// ============================================
// VENDOR PROFILE SETUP RESPONSE DTO
// ============================================

export class VendorProfileSetupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  businessName!: string | null;

  @ApiProperty({ nullable: true })
  publicEmail!: string | null;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ nullable: true })
  coverImage?: string;

  @ApiProperty()
  onboardingStep!: number;

  @ApiProperty({ type: [VendorProfileCuisineResponseDto] })
  cuisines!: VendorProfileCuisineResponseDto[];

  @ApiProperty({ type: [VendorProfileSocialLinkResponseDto] })
  socialLinks!: VendorProfileSocialLinkResponseDto[];
}

// ============================================
// OPERATION HOURS RESPONSE DTOs
// ============================================

export class OperationHourDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Day of week (0 = Sunday, 6 = Saturday)' })
  dayOfWeek!: number;

  @ApiProperty({ nullable: true })
  openTime!: string | null;

  @ApiProperty({ nullable: true })
  closeTime!: string | null;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  activeFrom!: Date;

  @ApiProperty({ nullable: true })
  activeTo!: Date | null;

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

export class TodayStatusResponseDto {
  @ApiProperty()
  isOpen!: boolean;

  @ApiProperty({ nullable: true })
  openTime!: string | null;

  @ApiProperty({ nullable: true })
  closeTime!: string | null;

  @ApiProperty()
  leavingSoonEnabled!: boolean;

  @ApiProperty({ nullable: true })
  leavingSoonMinutes!: number | null;

  @ApiProperty({ nullable: true })
  customLeavingTime!: string | null;

  @ApiProperty({ nullable: true })
  timeUntilClose!: number | null;

  @ApiProperty({ nullable: true })
  timeUntilLeavingSoon!: number | null;
}

export class OperationHoursResponseDto {
  @ApiProperty()
  vendorId!: string;

  @ApiProperty()
  activePeriodStart!: Date;

  @ApiProperty({ nullable: true })
  activePeriodEnd!: Date | null;

  @ApiProperty({ type: [OperationHourDetailResponseDto] })
  hours!: OperationHourDetailResponseDto[];

  @ApiProperty({ type: TodayStatusResponseDto })
  todayStatus!: TodayStatusResponseDto;
}
