import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogHelper } from './audit-log.helper';

@Module({
    controllers: [AuditLogController],
    providers: [AuditLogService, AuditLogHelper],
    exports: [AuditLogService, AuditLogHelper],
})
export class AuditLogModule { }