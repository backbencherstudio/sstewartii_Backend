// src/modules/admin/audit-log/audit-log.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import {
  AuditLogFilterDto,
  CreateAuditLogDto,
  AuditLogResponseDto,
  AuditLogListResponseDto,
  AuditLogSummaryDto,
  AuditActionsResponseDto,
} from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create audit log
   */
  async create(data: CreateAuditLogDto): Promise<AuditLogResponseDto | null> {
    try {
      const log = await this.prisma.auditLog.create({
        data: {
          adminId: data.adminId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          changes: data.changes,
          reason: data.reason,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return log as AuditLogResponseDto;
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Get all audit logs with search and pagination
   */
  async findAll(filters: AuditLogFilterDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build search conditions
    let searchCondition: any = {};

    if (filters.search) {
      const search = filters.search;
      searchCondition = {
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { entity: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
          { reason: { contains: search, mode: 'insensitive' } },
          {
            admin: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: searchCondition,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: searchCondition }),
    ]);

    return {
      data: items as AuditLogResponseDto[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit log by ID
   */
  async findOne(id: string): Promise<AuditLogResponseDto | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return log as AuditLogResponseDto | null;
  }

  /**
   * Get audit log summary
   */
  async getSummary(): Promise<AuditLogSummaryDto> {
    const [total, byAction, byEntity, recentActivity] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      total,
      byAction: byAction.map(item => ({
        action: item.action,
        count: item._count,
      })),
      byEntity: byEntity.map(item => ({
        entity: item.entity,
        count: item._count,
      })),
      recentActivity: recentActivity as AuditLogResponseDto[],
    };
  }

  /**
   * Get available actions
   */
  async getActions(): Promise<AuditActionsResponseDto> {
    return {
      actions: Object.values(AuditAction),
    };
  }
}