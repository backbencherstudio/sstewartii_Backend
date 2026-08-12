// src/modules/admin/audit-log/audit-log.helper.ts

import { Injectable } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/audit-log.dto';
import { Request } from 'express';

@Injectable()
export class AuditLogHelper {
    constructor(private readonly auditLogService: AuditLogService) { }

    /**
     * Simple log method
     */
    async log(
        adminId: string,
        action: string,
        entity: string,
        entityId?: string | null,
        changes?: any,
        reason?: string,
        req?: Request,
    ) {
        const data: CreateAuditLogDto = {
            adminId,
            action,
            entity,
            entityId,
            changes,
            reason,
            ipAddress: this.getIpAddress(req),
            userAgent: req?.headers?.['user-agent'] as string,
        };
        return this.auditLogService.create(data);
    }

    /**
     * Log KYC action
     */
    async logKyc(
        adminId: string,
        action: 'APPROVE_KYC' | 'REJECT_KYC' | 'REQUEST_KYC_REVIEW',
        vendorId: string,
        reason?: string,
        req?: Request,
    ) {
        return this.log(adminId, action, 'Vendor', vendorId, { action }, reason, req);
    }

    /**
     * Log Vendor action
     */
    async logVendor(
        adminId: string,
        action: 'SUSPEND_VENDOR' | 'ACTIVATE_VENDOR' | 'DISABLE_VENDOR' | 'ENABLE_VENDOR',
        vendorId: string,
        reason?: string,
        req?: Request,
    ) {
        return this.log(adminId, action, 'Vendor', vendorId, { action }, reason, req);
    }

    /**
     * Log User action
     */
    async logUser(
        adminId: string,
        action: 'BLOCK_USER' | 'UNBLOCK_USER' | 'DELETE_USER' | 'RESTORE_USER',
        userId: string,
        reason?: string,
        req?: Request,
    ) {
        return this.log(adminId, action, 'User', userId, { action }, reason, req);
    }

    /**
     * Log Product action
     */
    async logProduct(
        adminId: string,
        action: 'APPROVE_PRODUCT' | 'REJECT_PRODUCT' | 'HIDE_PRODUCT',
        productId: string,
        reason?: string,
        req?: Request,
    ) {
        return this.log(adminId, action, 'Product', productId, { action }, reason, req);
    }

    /**
     * Get IP address from request
     */
    private getIpAddress(req?: Request): string | undefined {
        if (!req) return undefined;
        return (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (req.headers?.['x-real-ip'] as string) ||
            req.ip;
    }
}