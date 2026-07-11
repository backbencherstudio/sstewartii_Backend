import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from '../../application/notification.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import {
  CreateNotificationDto,
  MarkNotificationReadDto,
  UpdateNotificationSettingsDto,
  UpdateAdminNotificationPreferencesDto,
  UpdateVendorNotificationPreferencesDto,
  UpdateCustomerNotificationPreferencesDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
  NotificationResponseDto,
  RegisterDeviceDto,
} from '../dto/notification.dto';
import { NotificationType, NotificationStatus } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ============================================
  // NOTIFICATION CRUD
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  async getNotifications(
    @CurrentUser() user: AuthUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
  ): Promise<NotificationListResponseDto> {
    return this.notificationService.getNotifications(
      user.id,
      parseInt(page),
      parseInt(limit),
      type,
      status,
    );
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(
    @CurrentUser() user: AuthUser,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ResponseMessage('Notifications marked as read')
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Body() dto: MarkNotificationReadDto,
  ): Promise<{ count: number }> {
    return this.notificationService.markAsRead(user.id, dto.notificationIds);
  }

  @Post('read/all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ResponseMessage('All notifications marked as read')
  async markAllAsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<{ count: number }> {
    return this.notificationService.markAllAsRead(user.id);
  }

  // ============================================
  // DEVICE MANAGEMENT
  // ============================================

  @Post('device/register')
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ResponseMessage('Device registered successfully')
  async registerDevice(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterDeviceDto,
  ): Promise<{ message: string }> {
    return this.notificationService.registerDevice(user.id, dto);
  }

  @Delete('device/unregister')
  @ApiOperation({ summary: 'Unregister device from push notifications' })
  @ResponseMessage('Device unregistered successfully')
  async unregisterDevice(
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string }> {
    return this.notificationService.unregisterDevice(user.id);
  }

  // ============================================
  // NOTIFICATION SETTINGS
  // ============================================

  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings (role-based)' })
  async getSettings(@CurrentUser() user: AuthUser) {
    return this.notificationService.getSettings(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update notification settings' })
  @ResponseMessage('Settings updated successfully')
  async updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationService.updateSettings(user.id, dto);
  }

  // ============================================
  // ADMIN SETTINGS
  // ============================================

  @Patch('settings/admin')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update admin notification preferences' })
  @ResponseMessage('Admin preferences updated')
  async updateAdminPrefs(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAdminNotificationPreferencesDto,
  ) {
    return this.notificationService.updateAdminPrefs(user.id, dto);
  }

  // ============================================
  // VENDOR SETTINGS
  // ============================================

  @Patch('settings/vendor')
  @UseGuards(RoleGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Update vendor notification preferences' })
  @ResponseMessage('Vendor preferences updated')
  async updateVendorPrefs(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateVendorNotificationPreferencesDto,
  ) {
    return this.notificationService.updateVendorPrefs(user.id, dto);
  }

  // ============================================
  // CUSTOMER SETTINGS
  // ============================================

  @Patch('settings/customer')
  @ApiOperation({ summary: 'Update customer notification preferences' })
  @ResponseMessage('Customer preferences updated')
  async updateCustomerPrefs(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCustomerNotificationPreferencesDto,
  ) {
    return this.notificationService.updateCustomerPrefs(user.id, dto);
  }

  // ============================================
  // ADMIN ONLY: Send notifications
  // ============================================

  @Post('send')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send notification to a user (Admin only)' })
  @ResponseMessage('Notification sent successfully')
  async sendNotification(
    @CurrentUser() adminUser: AuthUser,
    @Body() dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto | null> {
    return this.notificationService.send(adminUser.id, {
      title: dto.title,
      body: dto.body,
      type: dto.type,
      channel: dto.channel,
      data: dto.data,
      scheduledFor: dto.scheduledFor,
    });
  }

  @Post('send/bulk')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send bulk notifications (Admin only)' })
  @ResponseMessage('Bulk notifications sent')
  async sendBulkNotifications(
    @Body() dto: { userIds: string[] } & Omit<CreateNotificationDto, 'userId'>,
  ): Promise<{ count: number }> {
    const { userIds, ...notificationData } = dto;
    return this.notificationService.sendBulk(userIds, notificationData);
  }
}
