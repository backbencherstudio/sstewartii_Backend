import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();
  private isServerReady: boolean = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    this.isServerReady = true;
    this.logger.log('✅ WebSocket Server initialized and ready');
  }

  async handleConnection(client: SocketWithUser) {
    try {
      // ✅ Check if server is ready
      if (!this.isServerReady) {
        this.logger.warn('⚠️ Server not ready, waiting...');
        // Wait for server to be ready
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (this.isServerReady) {
              clearInterval(checkInterval);
              resolve(true);
            }
          }, 50);
        });
      }

      const token = client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn(
          `❌ Connection rejected: No token provided for ${client.id}`,
        );
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect();
        return;
      }

      // Verify token
      let payload: any;
      try {
        payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('jwt.secret'),
        });
      } catch (error: any) {
        this.logger.warn(`❌ Invalid token for ${client.id}: ${error.message}`);
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn(
          `❌ Connection rejected: No userId in token for ${client.id}`,
        );
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      // Store user data
      client.data.userId = userId;
      this.socketUsers.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user room
      await client.join(`user:${userId}`);

      this.logger.log(`✅ User ${userId} connected (${client.id})`);
      this.logger.log(`🔌 Active connections: ${this.socketUsers.size}`);

      // Send connection success
      client.emit('connected', {
        status: 'connected',
        userId,
        socketId: client.id,
      });

      // ✅ Send unread count after connection is established
      try {
        await this.sendUnreadCount(userId);
      } catch (error: any) {
        this.logger.error(`Failed to send unread count: ${error.message}`);
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Connection error for ${client.id}: ${errorMessage}`,
      );

      try {
        client.emit('error', {
          message: 'Connection failed',
          error: errorMessage,
        });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (emitError: any) {
        // Ignore emit errors
      }

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
      const user = await this.prisma.user.findUnique({
        where: { id: adminId },
        include: { role: true },
      });

      if (user?.role?.name !== 'ADMIN') {
        client.emit('error', { message: 'Only admins can send notifications' });
        return;
      }

      if (!data.userId) {
        client.emit('error', { message: 'userId is required' });
        return;
      }

      const notification = await this.notificationService.send(data.userId, {
        title: data.title,
        body: data.body,
        type: data.type as any,
        channel: data.channel as any,
        data: data.data,
        scheduledFor: data.scheduledFor,
      });

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

      client.emit('mark-read-success', {
        notificationIds: data.notificationIds,
        status: 'READ',
      });

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

      client.emit('mark-all-read-success', {
        count: result.count,
        status: 'all_read',
      });

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

  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(
    @ConnectedSocket() client: SocketWithUser,
  ): Promise<void> {
    const userId = client.data.userId;
    if (userId) {
      await this.sendUnreadCount(userId);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // ============================================
  // PUBLIC METHODS (Server → Client)
  // ============================================

  // ✅ FIXED: Safe method with null checks
  sendToUser(userId: string, notification: any): boolean {
    try {
      if (!this.isServerReady || !this.server) {
        this.logger.warn(`⚠️ Server not ready, cannot send to ${userId}`);
        return false;
      }

      const room = `user:${userId}`;
      // ✅ Safe access with optional chaining
      const hasSockets =
        this.server.sockets?.adapter?.rooms?.has(room) ?? false;

      if (hasSockets) {
        this.server.to(room).emit('new-notification', notification);
        this.logger.log(`📤 Real-time notification sent to user ${userId}`);
        return true;
      }

      this.logger.warn(
        `⚠️ User ${userId} is offline, notification saved in DB`,
      );
      return false;
    } catch (error) {
      this.logger.error(`Failed to send notification to ${userId}:`, error);
      return false;
    }
  }

  sendToUsers(userIds: string[], notification: any): void {
    for (const userId of userIds) {
      this.sendToUser(userId, notification);
    }
  }

  broadcastToAll(notification: any): void {
    try {
      if (!this.isServerReady || !this.server) {
        this.logger.warn(`⚠️ Server not ready, cannot broadcast`);
        return;
      }
      this.server.emit('new-notification', notification);
      this.logger.log(`📤 Broadcast notification to all users`);
    } catch (error) {
      this.logger.error(`Failed to broadcast notification:`, error);
    }
  }

  // ✅ FIXED: Safe method with null checks
  async sendUnreadCount(userId: string): Promise<void> {
    try {
      if (!this.isServerReady || !this.server) {
        this.logger.warn(
          `⚠️ Server not ready, skipping unread count for ${userId}`,
        );
        return;
      }

      const count = await this.prisma.notificationLog.count({
        where: {
          userId,
          readAt: null,
        },
      });

      const room = `user:${userId}`;
      // ✅ Safe access with optional chaining
      const hasRoom = this.server.sockets?.adapter?.rooms?.has(room) ?? false;

      if (hasRoom) {
        this.server.to(room).emit('unread-count', { count });
        this.logger.log(`📊 Unread count sent to ${userId}: ${count}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send unread count to ${userId}:`, error);
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(this.socketUsers.values());
  }

  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
