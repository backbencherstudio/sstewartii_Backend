import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from '../../application/notification.service';

interface SendNotificationDto {
  userId: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  data?: Record<string, any>;
  scheduledFor?: string;
}

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
  path: '/ws',
})
@Injectable()
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================
  // CONNECTION / DISCONNECTION
  // ============================================

  async handleConnection(client: SocketWithUser) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn(
          `❌ Connection rejected: No token provided for ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn(
          `❌ Connection rejected: Invalid token payload for ${client.id}`,
        );
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      this.socketUsers.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      await client.join(`user:${userId}`);

      this.logger.log(`✅ User ${userId} connected (${client.id})`);
      this.logger.log(`🔌 Active connections: ${this.socketUsers.size}`);

      // Send connection success
      client.emit('connected', {
        status: 'connected',
        userId,
        socketId: client.id,
      });

      // Send initial unread count
      await this.sendUnreadCount(userId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Connection error for ${client.id}: ${errorMessage}`,
      );
      client.emit('error', {
        message: 'Authentication failed',
        error: errorMessage,
      });
      client.disconnect();
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    const userId = client.data.userId;

    if (userId) {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      await client.leave(`user:${userId}`);
      this.socketUsers.delete(client.id);

      this.logger.log(`❌ User ${userId} disconnected (${client.id})`);
      this.logger.log(`🔌 Active connections: ${this.socketUsers.size}`);
    }
  }

  // ============================================
  // WEBSOCKET EVENTS (Client → Server)
  // ============================================

  // 1. SEND NOTIFICATION
  @SubscribeMessage('send-notification')
  async handleSendNotification(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: SendNotificationDto,
  ): Promise<void> {
    const adminId = client.data.userId;

    if (!adminId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      // Check if user has permission (admin only)
      const user = await this.prisma.user.findUnique({
        where: { id: adminId },
        include: { role: true },
      });

      if (user?.role?.name !== 'ADMIN') {
        client.emit('error', { message: 'Only admins can send notifications' });
        return;
      }

      // Validate required fields
      if (!data.userId) {
        client.emit('error', { message: 'userId is required' });
        return;
      }

      // Send notification
      const notification = await this.notificationService.send(data.userId, {
        title: data.title,
        body: data.body,
        type: data.type as any,
        channel: data.channel as any,
        data: data.data,
        scheduledFor: data.scheduledFor,
      });

      // Acknowledge to sender
      client.emit('notification-sent', {
        success: true,
        notification,
      });

      this.logger.log(`📤 Notification sent by ${adminId} to ${data.userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        message: 'Failed to send notification',
        error: errorMessage,
      });
    }
  }

  // 2. MARK NOTIFICATIONS AS READ
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { notificationIds: string[] },
  ): Promise<void> {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      // Verify notifications belong to user
      const notifications = await this.prisma.notificationLog.findMany({
        where: {
          id: { in: data.notificationIds },
          userId,
        },
        select: { id: true },
      });

      if (notifications.length !== data.notificationIds.length) {
        client.emit('error', {
          message: 'Some notifications do not belong to this user',
        });
        return;
      }

      // Mark as read
      await this.prisma.notificationLog.updateMany({
        where: {
          id: { in: data.notificationIds },
          readAt: null,
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });

      // ✅ Send success to the user who requested
      client.emit('mark-read-success', {
        notificationIds: data.notificationIds,
        status: 'READ',
      });

      // ✅ Send updated unread count to the same user
      await this.sendUnreadCount(userId);

      this.logger.log(
        `📖 User ${userId} marked ${data.notificationIds.length} notifications as read`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        message: 'Failed to mark as read',
        error: errorMessage,
      });
    }
  }

  // 3. MARK ALL AS READ
  @SubscribeMessage('mark-all-read')
  async handleMarkAllRead(
    @ConnectedSocket() client: SocketWithUser,
  ): Promise<void> {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      const result = await this.prisma.notificationLog.updateMany({
        where: {
          userId,
          readAt: null,
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });

      // ✅ Send success to the user
      client.emit('mark-all-read-success', {
        count: result.count,
        status: 'all_read',
      });

      // ✅ Send updated unread count to the same user
      await this.sendUnreadCount(userId);

      this.logger.log(`📖 User ${userId} marked all notifications as read`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      client.emit('error', {
        message: 'Failed to mark all as read',
        error: errorMessage,
      });
    }
  }

  // 4. GET UNREAD COUNT
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(
    @ConnectedSocket() client: SocketWithUser,
  ): Promise<void> {
    const userId = client.data.userId;
    if (userId) {
      await this.sendUnreadCount(userId);
    }
  }

  // 5. PING (Keep-alive)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // ============================================
  // PUBLIC METHODS (Server → Client)
  // ============================================

  // Send notification to a specific user
  sendToUser(userId: string, notification: any): boolean {
    const room = `user:${userId}`;
    const hasSockets = this.server.sockets.adapter.rooms.has(room);

    if (hasSockets) {
      this.server.to(room).emit('new-notification', notification);
      this.logger.log(`📤 Real-time notification sent to user ${userId}`);
      return true;
    }

    this.logger.warn(`⚠️ User ${userId} is offline, notification saved in DB`);
    return false;
  }

  // Send notification to multiple users
  sendToUsers(userIds: string[], notification: any): void {
    for (const userId of userIds) {
      this.sendToUser(userId, notification);
    }
  }

  // Broadcast to all connected users
  broadcastToAll(notification: any): void {
    this.server.emit('new-notification', notification);
    this.logger.log(`📤 Broadcast notification to all users`);
  }

  // Send unread count to a specific user
  async sendUnreadCount(userId: string): Promise<void> {
    const count = await this.prisma.notificationLog.count({
      where: {
        userId,
        readAt: null,
      },
    });

    const room = `user:${userId}`;
    if (this.server.sockets.adapter.rooms.has(room)) {
      this.server.to(room).emit('unread-count', { count });
    }
  }

  // Get connected users
  getConnectedUsers(): string[] {
    return Array.from(this.socketUsers.values());
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  // Get user's socket count
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
