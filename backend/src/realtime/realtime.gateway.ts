// backend/src/realtime/realtime.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole } from '../common/staff-role.entity';
import { authenticateSocketToken, SocketUser } from './realtime.auth';
import { PresenceRegistry, Presence } from './presence.registry';
import { isValidTopic } from './realtime.topics';

@WebSocketGateway({
  namespace: '/rt',
  path: '/api/secretaria/socket.io',
  cors: { origin: [/mundoworld\.school$/, /localhost/], credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private registry = new PresenceRegistry();

  constructor(
    private jwt: JwtService,
    @InjectRepository(StaffRole) private staffRoles: Repository<StaffRole>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      const user = await authenticateSocketToken(token, this.jwt, this.staffRoles);
      client.data.user = user;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const affected = this.registry.leave(client.id);
    for (const roomKey of affected) {
      this.server.to(roomKey).emit('presence', { roomKey, present: this.registry.list(roomKey) });
    }
  }

  @SubscribeMessage('subscribe')
  onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { topics: string[] }) {
    for (const t of body?.topics ?? []) {
      if (isValidTopic(t)) client.join(`topic:${t}`);
    }
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { topics: string[] }) {
    for (const t of body?.topics ?? []) client.leave(`topic:${t}`);
  }

  @SubscribeMessage('presence:join')
  onPresenceJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string }) {
    const user = client.data.user as SocketUser;
    if (!user || !body?.roomKey) return;
    client.join(body.roomKey);
    this.registry.join(body.roomKey, client.id, user.userId, user.displayName);
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  @SubscribeMessage('presence:leave')
  onPresenceLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string }) {
    if (!body?.roomKey) return;
    client.leave(body.roomKey);
    this.registry.leave(client.id); // simplificacion: re-join al cambiar de pantalla
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  @SubscribeMessage('edit:start')
  onEditStart(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string; targetKey: string }) {
    if (!body?.roomKey) return;
    this.registry.setEditing(client.id, body.roomKey, body.targetKey ?? null);
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  @SubscribeMessage('edit:stop')
  onEditStop(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string }) {
    if (!body?.roomKey) return;
    this.registry.setEditing(client.id, body.roomKey, null);
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  // Llamado por ChangeFeedService al recibir un NOTIFY.
  broadcastChange(topic: string, action: string) {
    this.server.to(`topic:${topic}`).emit('change', { topic, action });
  }
}
