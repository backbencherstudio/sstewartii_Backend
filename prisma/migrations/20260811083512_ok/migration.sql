-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('APPROVE_KYC', 'REJECT_KYC', 'REQUEST_KYC_REVIEW', 'SUSPEND_VENDOR', 'ACTIVATE_VENDOR', 'DISABLE_VENDOR', 'ENABLE_VENDOR', 'BLOCK_USER', 'UNBLOCK_USER', 'DELETE_USER', 'RESTORE_USER', 'UPDATE_SUBSCRIPTION', 'CANCEL_SUBSCRIPTION', 'REFUND_PAYMENT', 'APPROVE_PRODUCT', 'REJECT_PRODUCT', 'HIDE_PRODUCT', 'UPDATE_CUISINE', 'DELETE_CUISINE', 'UPDATE_SETTINGS', 'RESOLVE_REPORT', 'REJECT_REPORT', 'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'PASSWORD_CHANGE', 'ROLE_CHANGE', 'SYSTEM_CONFIG_UPDATE');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
