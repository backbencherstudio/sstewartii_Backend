// src/modules/admin/audit-log/audit-log.controller.ts

import {
    Controller,
    Get,
    Post,
    Query,
    Param,
    UseGuards,
    BadRequestException,
    HttpStatus,
    Body,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiExtraModels,
    getSchemaPath,
} from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditLogHelper } from './audit-log.helper';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CurrentUser } from 'src/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from 'src/modules/auth/domain/interfaces/auth-user.interface';
import {
    AuditLogFilterDto,
    AuditLogResponseDto,
    AuditLogListResponseDto,
    AuditLogSummaryDto,
    AuditActionsResponseDto,
    CreateAuditLogDto,
} from './dto/audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@ApiExtraModels(
    AuditLogResponseDto,
    AuditLogListResponseDto,
    AuditLogSummaryDto,
    AuditActionsResponseDto,
)
@Controller('admin/audit-logs')
@UseGuards(RoleGuard)
@Roles(Role.ADMIN)
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
        private readonly auditLogHelper: AuditLogHelper,
    ) { }

    /**
     * Get all audit logs with search and pagination
     */
    @Get()
    @ApiOperation({
        summary: 'Get all audit logs',
        description: 'Search by action, entity, admin name/email, or entity ID'
    })
    async findAll(
        @Query() filters: AuditLogFilterDto,
    ) {
        const result = await this.auditLogService.findAll(filters);

        return {
            data: result.data,
            meta: result.meta
        }
    }

    /**
     * Get audit log by ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get audit log by ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns audit log details',
        schema: { allOf: [{ $ref: getSchemaPath(AuditLogResponseDto) }] },
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Audit log not found' })
    async findOne(@Param('id') id: string): Promise<AuditLogResponseDto> {
        const log = await this.auditLogService.findOne(id);
        if (!log) {
            throw new BadRequestException('Audit log not found');
        }
        return log;
    }

    /**
     * Create audit log manually (for testing)
     */
    @Post()
    @ApiOperation({ summary: 'Create audit log' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Audit log created',
        schema: { allOf: [{ $ref: getSchemaPath(AuditLogResponseDto) }] },
    })
    async create(
        @Body() dto: CreateAuditLogDto,
    ): Promise<AuditLogResponseDto> {
        const log = await this.auditLogService.create(dto);
        if (!log) {
            throw new BadRequestException('Failed to create audit log');
        }
        return log;
    }

    /**
     * Get audit log summary for dashboard
     */
    @Get('summary')
    @ApiOperation({ summary: 'Get audit log summary' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns summary statistics',
        schema: { allOf: [{ $ref: getSchemaPath(AuditLogSummaryDto) }] },
    })
    async getSummary(): Promise<AuditLogSummaryDto> {
        return this.auditLogService.getSummary();
    }

    /**
     * Get available audit actions
     */
    @Get('actions')
    @ApiOperation({ summary: 'Get available audit actions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns list of actions',
        schema: { allOf: [{ $ref: getSchemaPath(AuditActionsResponseDto) }] },
    })
    async getActions(): Promise<AuditActionsResponseDto> {
        return this.auditLogService.getActions();
    }
}