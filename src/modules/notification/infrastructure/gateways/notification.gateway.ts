// notification.gateway.ts
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

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
    token?: string;
    isAuthenticated?: boolean;
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
  private readonly MAX_RETRY_ATTEMPTS = 3;

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

  // ============================================
  // CONNECTION HANDLING - WITH ANONYMOUS SUPPORT
  // ============================================

  async handleConnection(client: SocketWithUser) {
    try {
      // Check if server is ready
      if (!this.isServerReady) {
        this.logger.warn('⚠️ Server not ready, waiting...');
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (this.isServerReady) {
              clearInterval(checkInterval);
              resolve(true);
            }
          }, 50);
        });
      }

      // ✅ 1. GET TOKEN (OPTIONAL - allow anonymous connection)
      const token = this.extractToken(client);

      // ✅ 2. If token exists, verify and authenticate
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get<string>('jwt.secret'),
          });

          const userId = payload.sub || payload.id;

          if (userId) {
            // Check if user exists
            const user = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, isDeleted: true },
            });

            if (user && !user.isDeleted) {
              // Store authenticated user data
              client.data.userId = userId;
              client.data.token = token;
              client.data.isAuthenticated = true;

              this.socketUsers.set(client.id, userId);

              if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
              }
              this.userSockets.get(userId)!.add(client.id);

              await client.join(`user:${userId}`);

              this.logger.log(
                `✅ User ${userId} authenticated and connected (${client.id})`,
              );

              // Send pending notifications for authenticated user
              await this.sendPendingNotifications(client, userId);
              await this.sendUnreadCount(userId);
              await this.markAllAsDelivered(userId);

              // Send connection success with auth status
              client.emit('connected', {
                status: 'connected',
                userId,
                socketId: client.id,
                isAuthenticated: true,
                timestamp: new Date().toISOString(),
              });

              this.logger.log(
                `🔌 Active connections: ${this.socketUsers.size}`,
              );
              return;
            }
          }
        } catch (error: any) {
          this.logger.warn(
            `⚠️ Invalid token for ${client.id}: ${error.message}`,
          );
          // Don't disconnect, allow anonymous connection
        }
      }

      // ✅ 3. Anonymous connection (no valid token)
      client.data.isAuthenticated = false;
      this.logger.log(`🔌 Anonymous connection ${client.id} (no valid token)`);

      client.emit('connected', {
        status: 'connected',
        socketId: client.id,
        isAuthenticated: false,
        message:
          'Connected anonymously. Please authenticate to receive notifications.',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`🔌 Active connections: ${this.socketUsers.size}`);
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
          code: 'CONNECTION_FAILED',
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
    } else {
      this.socketUsers.delete(client.id);
      this.logger.log(`❌ Anonymous client ${client.id} disconnected`);
    }
  }

  // ============================================
  // ✅ UPDATE TOKEN - AUTHENTICATE ANONYMOUS CONNECTION
  // ============================================

  @SubscribeMessage('update-token')
  async handleUpdateToken(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { token: string },
  ): Promise<void> {
    try {
      if (!data.token) {
        client.emit('error', {
          message: 'Token is required',
          code: 'TOKEN_REQUIRED',
        });
        return;
      }

      // Verify the new token
      let payload: any;
      try {
        payload = this.jwtService.verify(data.token, {
          secret: this.configService.get<string>('jwt.secret'),
        });
      } catch (error: any) {
        this.logger.warn(`❌ Invalid token for update: ${error.message}`);
        client.emit('error', {
          message: 'Invalid authentication token',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      const newUserId = payload.sub || payload.id;

      if (!newUserId) {
        client.emit('error', {
          message: 'Invalid token payload',
          code: 'INVALID_PAYLOAD',
        });
        return;
      }

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: newUserId },
        select: { id: true, isDeleted: true },
      });

      if (!user || user.isDeleted) {
        client.emit('error', {
          message: 'User not found or account deleted',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Get old user ID if exists
      const oldUserId = client.data.userId;

      // If user ID changed, update mappings
      if (oldUserId && oldUserId !== newUserId) {
        // Remove from old user's sockets
        const oldSockets = this.userSockets.get(oldUserId);
        if (oldSockets) {
          oldSockets.delete(client.id);
          if (oldSockets.size === 0) {
            this.userSockets.delete(oldUserId);
          }
        }
        // Leave old room
        await client.leave(`user:${oldUserId}`);
        this.socketUsers.delete(client.id);
      }

      // Update client data
      client.data.userId = newUserId;
      client.data.token = data.token;
      client.data.isAuthenticated = true;
      this.socketUsers.set(client.id, newUserId);

      // Add to new user's sockets
      if (!this.userSockets.has(newUserId)) {
        this.userSockets.set(newUserId, new Set());
      }
      this.userSockets.get(newUserId)!.add(client.id);

      // Join new user room
      await client.join(`user:${newUserId}`);

      this.logger.log(
        `🔄 Token updated: ${oldUserId || 'anonymous'} -> ${newUserId} (${client.id})`,
      );
      this.logger.log(`🔌 Active connections: ${this.socketUsers.size}`);

      // Send success response
      client.emit('token-updated', {
        status: 'success',
        userId: newUserId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });

      // Send pending notifications for the new user
      await this.sendPendingNotifications(client, newUserId);
      await this.sendUnreadCount(newUserId);
      await this.markAllAsDelivered(newUserId);
      await this.sendWelcomeNotification(client, newUserId);

      this.logger.log(`✅ Token updated successfully for user ${newUserId}`);
    } catch (error: any) {
      this.logger.error(`Failed to update token: ${error.message}`);
      client.emit('error', {
        message: 'Failed to update token',
        error: error.message,
        code: 'UPDATE_FAILED',
      });
    }
  }

  // ============================================
  // TOKEN EXTRACTION HELPERS
  // ============================================

  private extractToken(client: SocketWithUser): string | null {
    // Try from auth
    const authToken = client.handshake.auth.token;
    if (authToken) return authToken;

    // Try from query
    const queryToken = client.handshake.query.token;
    if (queryToken) return queryToken as string;

    // Try from headers
    const headers = client.handshake.headers;
    const authHeader = headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    return null;
  }

  // ============================================
  // ✅ FRONTEND EVENT HANDLERS
  // ============================================

  // ✅ FRONTEND SENDS ACKNOWLEDGMENT
  @SubscribeMessage('notification-received')
  async handleNotificationReceived(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { notificationId: string },
  ): Promise<void> {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      // Mark notification as received/delivered
      await this.prisma.notificationLog.update({
        where: {
          id: data.notificationId,
          userId,
        },
        data: {
          deliveredAt: new Date(),
          status: 'DELIVERED',
        },
      });

      client.emit('notification-acknowledged', {
        notificationId: data.notificationId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `✅ Notification ${data.notificationId} acknowledged by user ${userId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to acknowledge notification: ${error.message}`);
    }
  }

  // ✅ FRONTEND SENDS READ STATUS
  @SubscribeMessage('notification-read')
  async handleNotificationRead(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { notificationIds: string[] },
  ): Promise<void> {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      await this.prisma.notificationLog.updateMany({
        where: {
          id: { in: data.notificationIds },
          userId,
          readAt: null,
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });

      client.emit('notification-read-success', {
        notificationIds: data.notificationIds,
        status: 'read',
        timestamp: new Date().toISOString(),
      });

      // Send updated unread count
      await this.sendUnreadCount(userId);

      this.logger.log(
        `📖 User ${userId} marked ${data.notificationIds.length} notifications as read`,
      );
    } catch (error: any) {
      client.emit('error', {
        message: 'Failed to mark as read',
        error: error.message,
      });
    }
  }

  // ✅ FRONTEND REQUESTS UNREAD COUNT
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(
    @ConnectedSocket() client: SocketWithUser,
  ): Promise<void> {
    const userId = client.data.userId;
    if (userId) {
      await this.sendUnreadCount(userId);
    } else {
      client.emit('error', { message: 'User not authenticated' });
    }
  }

  // ✅ FRONTEND REQUESTS PENDING NOTIFICATIONS
  @SubscribeMessage('get-pending-notifications')
  async handleGetPendingNotifications(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data?: { limit?: number },
  ): Promise<void> {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      const limit = data?.limit || 50;
      const pendingNotifications = await this.prisma.notificationLog.findMany({
        where: {
          userId,
          deliveredAt: null,
          readAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: limit,
      });

      client.emit('pending-notifications', {
        count: pendingNotifications.length,
        notifications: pendingNotifications,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `📤 Sent ${pendingNotifications.length} pending notifications to ${userId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to get pending notifications: ${error.message}`,
      );
      client.emit('error', {
        message: 'Failed to get pending notifications',
        error: error.message,
      });
    }
  }

  // ✅ FRONTEND SENDS PING
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: SocketWithUser): void {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      userId: client.data.userId || 'anonymous',
      isAuthenticated: client.data.isAuthenticated || false,
    });
  }

  // ✅ FRONTEND SENDS DISCONNECT
  @SubscribeMessage('disconnect-request')
  handleDisconnectRequest(@ConnectedSocket() client: SocketWithUser): void {
    this.logger.log(`📤 Client ${client.id} requested disconnect`);
    client.emit('disconnect-acknowledged', {
      status: 'disconnected',
      timestamp: new Date().toISOString(),
    });
    client.disconnect();
  }

  // ============================================
  // SEND PENDING NOTIFICATIONS
  // ============================================

  async sendPendingNotifications(client: SocketWithUser, userId: string) {
    try {
      // Get all undelivered notifications for this user
      const pendingNotifications = await this.prisma.notificationLog.findMany({
        where: {
          userId,
          deliveredAt: null,
          readAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 100,
      });

      if (pendingNotifications.length === 0) {
        this.logger.log(`📭 No pending notifications for user ${userId}`);
        client.emit('pending-notifications-empty', {
          message: 'No pending notifications',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      this.logger.log(
        `📤 Sending ${pendingNotifications.length} pending notifications to user ${userId}`,
      );

      // Send notifications in batches
      const batchSize = 10;
      const batches = this.chunkArray(pendingNotifications, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const isLastBatch = i === batches.length - 1;

        for (const notification of batch) {
          client.emit('new-notification', {
            ...notification,
            _meta: {
              pending: true,
              total: pendingNotifications.length,
              currentIndex: i * batchSize + batch.indexOf(notification) + 1,
            },
          });

          await this.sleep(50);
        }

        client.emit('pending-notifications-progress', {
          sent: Math.min((i + 1) * batchSize, pendingNotifications.length),
          total: pendingNotifications.length,
          percentage: Math.min(
            (((i + 1) * batchSize) / pendingNotifications.length) * 100,
            100,
          ),
          timestamp: new Date().toISOString(),
        });

        if (!isLastBatch) {
          await this.sleep(100);
        }
      }

      client.emit('pending-notifications-sync-complete', {
        count: pendingNotifications.length,
        message: `Synced ${pendingNotifications.length} notifications`,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `✅ Sync complete for user ${userId}: ${pendingNotifications.length} notifications`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send pending notifications: ${error.message}`,
      );
      client.emit('pending-notifications-error', {
        message: 'Failed to sync pending notifications',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ============================================
  // SEND WELCOME NOTIFICATION
  // ============================================

  async sendWelcomeNotification(client: SocketWithUser, userId: string) {
    try {
      // Check if user has received welcome notification before
      const welcomeCheck = await this.prisma.notificationLog.findFirst({
        where: {
          userId,
          title: 'Welcome Back! 🎉',
          deliveredAt: { not: null },
        },
      });

      if (!welcomeCheck) {
        const notification = await this.prisma.notificationLog.create({
          data: {
            userId,
            type: 'APP_UPDATE',
            channel: 'PUSH',
            title: 'Welcome Back! 🎉',
            body: `We're glad to see you again!`,
            data: {
              screen: 'home',
              action: 'welcome',
              timestamp: new Date().toISOString(),
            },
            status: 'SENT',
            sentAt: new Date(),
            deliveredAt: new Date(),
          },
        });

        client.emit('new-notification', notification);
        this.logger.log(`🎉 Welcome notification sent to user ${userId}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send welcome notification: ${error.message}`,
      );
    }
  }

  // ============================================
  // MARK ALL AS DELIVERED
  // ============================================

  async markAllAsDelivered(userId: string) {
    try {
      const result = await this.prisma.notificationLog.updateMany({
        where: {
          userId,
          deliveredAt: null,
          readAt: null,
        },
        data: {
          deliveredAt: new Date(),
          status: 'DELIVERED',
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `✅ Marked ${result.count} notifications as delivered for user ${userId}`,
        );
      }

      return result.count;
    } catch (error: any) {
      this.logger.error(`Failed to mark as delivered: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // PUBLIC METHODS (Server → Client)
  // ============================================

  sendToUser(userId: string, notification: any): boolean {
    try {
      if (!this.isServerReady || !this.server) {
        this.logger.warn(`⚠️ Server not ready, cannot send to ${userId}`);
        return false;
      }

      const room = `user:${userId}`;
      const hasSockets =
        this.server.sockets?.adapter?.rooms?.has(room) ?? false;

      if (hasSockets) {
        this.server.to(room).emit('new-notification', {
          ...notification,
          deliveredAt: new Date().toISOString(),
        });
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
      this.server.emit('new-notification', {
        ...notification,
        broadcast: true,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`📤 Broadcast notification to all users`);
    } catch (error) {
      this.logger.error(`Failed to broadcast notification:`, error);
    }
  }

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
          deliveredAt: { not: null },
        },
      });

      const room = `user:${userId}`;
      const hasRoom = this.server.sockets?.adapter?.rooms?.has(room) ?? false;

      if (hasRoom) {
        this.server.to(room).emit('unread-count', {
          count,
          timestamp: new Date().toISOString(),
        });
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

  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
