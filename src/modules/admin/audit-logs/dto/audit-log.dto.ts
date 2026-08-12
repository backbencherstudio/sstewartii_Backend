import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// REQUEST DTOs
// ============================================

export class AuditLogFilterDto {
  @ApiPropertyOptional({
    description: 'Search by action, entity, admin name/email, or entity ID',
    example: 'APPROVE_KYC',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'Admin ID who performed the action',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  adminId: string;

  @ApiProperty({
    description: 'Action performed',
    example: 'APPROVE_KYC',
    enum: [
      'APPROVE_KYC', 'REJECT_KYC', 'REQUEST_KYC_REVIEW',
      'SUSPEND_VENDOR', 'ACTIVATE_VENDOR', 'DISABLE_VENDOR', 'ENABLE_VENDOR',
      'BLOCK_USER', 'UNBLOCK_USER', 'DELETE_USER', 'RESTORE_USER',
      'UPDATE_SUBSCRIPTION', 'CANCEL_SUBSCRIPTION', 'REFUND_PAYMENT',
      'APPROVE_PRODUCT', 'REJECT_PRODUCT', 'HIDE_PRODUCT',
      'UPDATE_CUISINE', 'DELETE_CUISINE', 'UPDATE_SETTINGS',
      'RESOLVE_REPORT', 'REJECT_REPORT',
      'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'PASSWORD_CHANGE', 'ROLE_CHANGE', 'SYSTEM_CONFIG_UPDATE'
    ],
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Entity type affected',
    example: 'Vendor',
    enum: ['Vendor', 'User', 'Product', 'Order', 'System', 'KYC', 'Subscription', 'Report', 'Cuisine', 'Settings'],
  })
  @IsString()
  entity: string;

  @ApiPropertyOptional({
    description: 'ID of the entity affected',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  entityId?: string | null;

  @ApiPropertyOptional({
    description: 'Changes made (before/after state)',
    example: { from: 'PENDING', to: 'APPROVED' },
  })
  @IsOptional()
  changes?: any;

  @ApiPropertyOptional({
    description: 'Reason for the action',
    example: 'KYC documents verified successfully',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'IP address of the requester',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent of the requester',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class AdminUserDto {
  @ApiProperty({
    description: 'Admin ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin name',
    example: 'Super Admin',
  })
  name: string;

  @ApiProperty({
    description: 'Admin email',
    example: 'admin@gmail.com',
  })
  email: string;
}

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'Audit log ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin ID who performed the action',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  adminId: string;

  @ApiProperty({
    description: 'Admin who performed the action',
    type: AdminUserDto,
  })
  admin: AdminUserDto;

  @ApiProperty({
    description: 'Action performed',
    example: 'APPROVE_KYC',
  })
  action: string;

  @ApiProperty({
    description: 'Entity type affected',
    example: 'Vendor',
  })
  entity: string;

  @ApiProperty({
    description: 'ID of the entity affected',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  entityId: string | null;

  @ApiProperty({
    description: 'Changes made (before/after state)',
    example: { from: 'PENDING_REVIEW', to: 'APPROVED' },
    nullable: true,
  })
  changes: any | null;

  @ApiProperty({
    description: 'Reason for the action',
    example: 'KYC documents verified successfully',
    nullable: true,
  })
  reason: string | null;

  @ApiProperty({
    description: 'IP address of the requester',
    example: '192.168.1.1',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiProperty({
    description: 'User agent of the requester',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: Date;
}

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Has previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Has next page',
    example: true,
  })
  hasNextPage: boolean;
}

export class AuditLogListResponseDto {
  @ApiProperty({
    description: 'List of audit logs',
    type: [AuditLogResponseDto],
  })
  data: AuditLogResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class AuditLogSummaryDto {
  @ApiProperty({
    description: 'Total number of audit logs',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Actions breakdown',
    type: 'array',
    example: [
      { action: 'APPROVE_KYC', count: 45 },
      { action: 'ADMIN_LOGIN', count: 30 },
    ],
  })
  byAction: Array<{
    action: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Entities breakdown',
    type: 'array',
    example: [
      { entity: 'Vendor', count: 80 },
      { entity: 'User', count: 40 },
    ],
  })
  byEntity: Array<{
    entity: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Recent activity (last 10 logs)',
    type: [AuditLogResponseDto],
  })
  recentActivity: AuditLogResponseDto[];
}

export class AuditActionsResponseDto {
  @ApiProperty({
    description: 'List of available audit actions',
    type: 'array',
    example: [
      'APPROVE_KYC',
      'REJECT_KYC',
      'SUSPEND_VENDOR',
      'ACTIVATE_VENDOR',
    ],
  })
  actions: string[];
}