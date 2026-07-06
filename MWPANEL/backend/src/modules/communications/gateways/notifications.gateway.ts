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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface BadgeUpdatePayload {
  messages?: number;
  notifications?: number;
}

export interface NewMessagePayload {
  messageId: string;
  senderId: string;
  senderName: string;
  subject: string;
  preview: string;
  type: 'direct' | 'group' | 'announcement';
  unreadCount: number;
  conversationId?: string;
}

export interface NewNotificationPayload {
  notificationId: string;
  title: string;
  content: string;
  type: string;
  actionUrl?: string;
  unreadCount: number;
}

/**
 * Gateway WebSocket para notificaciones en tiempo real.
 *
 * Cada usuario autenticado se une a la sala `user:{userId}`.
 * Los eventos emitidos son:
 *   - `new_message`        → nuevo mensaje recibido
 *   - `notification_created` → nueva notificación del sistema
 *   - `badge_update`       → actualización de contadores (al leer)
 *
 * El cliente se autentica enviando el JWT en el handshake:
 *   socket = io('/ws', { auth: { token: 'Bearer ...' } })
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  // Mapa userId → Set de socketIds (un usuario puede tener varias pestañas)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const userId = await this.extractUserId(client);
      if (!userId) {
        this.logger.warn(`WS connection rejected: no valid token`);
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      client.join(`user:${userId}`);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      this.logger.log(`WS connected: user=${userId} socket=${client.id}`);
    } catch (err) {
      this.logger.warn(`WS connection error: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`WS disconnected: user=${userId} socket=${client.id}`);
    }
  }

  // ─── Client → Server events ───────────────────────────────────────────────

  /**
   * El cliente envía `join` con su userId como confirmación.
   * Responde con los contadores actuales (sync al reconectar).
   */
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    if (client.data.userId && client.data.userId !== userId) {
      return { error: 'userId mismatch' };
    }
    client.join(`user:${userId}`);
    return { status: 'joined', userId };
  }

  // ─── Server → Client emitters ─────────────────────────────────────────────

  /**
   * Notifica a un usuario que recibió un nuevo mensaje directo o de grupo.
   */
  sendNewMessage(userId: string, payload: NewMessagePayload) {
    this.server.to(`user:${userId}`).emit('new_message', payload);
    this.logger.debug(`→ new_message to user:${userId}`);
  }

  /**
   * Notifica a un usuario que se creó una notificación del sistema.
   */
  sendNewNotification(userId: string, payload: NewNotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification_created', payload);
    this.logger.debug(`→ notification_created to user:${userId}`);
  }

  /**
   * Actualiza los contadores de badges (usado tras marcar como leído).
   */
  sendBadgeUpdate(userId: string, payload: BadgeUpdatePayload) {
    this.server.to(`user:${userId}`).emit('badge_update', payload);
    this.logger.debug(`→ badge_update to user:${userId} ${JSON.stringify(payload)}`);
  }

  /**
   * Indica cuántos usuarios únicos están conectados (admin/debug).
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!(sockets && sockets.size > 0);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async extractUserId(client: Socket): Promise<string | null> {
    try {
      // Acepta token en: auth.token, headers.authorization, query.token
      const raw =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        client.handshake.query?.token;

      if (!raw) return null;

      const token = typeof raw === 'string' ? raw.replace('Bearer ', '') : null;
      if (!token) return null;

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      return payload?.sub || payload?.userId || null;
    } catch {
      return null;
    }
  }
}
