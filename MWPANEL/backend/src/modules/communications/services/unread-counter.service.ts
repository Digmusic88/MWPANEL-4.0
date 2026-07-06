import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../../cache/cache.service';
import { UnreadCounter, UnreadCounterType } from '../entities/unread-counter.entity';

const TTL_SECONDS = 600; // 10 min en Redis

function redisKey(userId: string, type: UnreadCounterType): string {
  return `unread:${userId}:${type}`;
}

/**
 * UnreadCounterService — gestión de contadores de no leídos.
 *
 * Estrategia de caché:
 *   1. LECTURA  → Redis primero (< 1ms). Si cache miss → BD → warm Redis.
 *   2. ESCRITURA → Redis INCR/DECR atómico + upsert en BD (sin bloquear).
 *   3. RESET    → Redis SET 0 + BD set 0.
 *
 * El servicio es tolerante a fallos de Redis:
 * si Redis no responde, cae al SELECT COUNT(*) en BD.
 */
@Injectable()
export class UnreadCounterService {
  private readonly logger = new Logger(UnreadCounterService.name);

  constructor(
    @InjectRepository(UnreadCounter)
    private readonly counterRepo: Repository<UnreadCounter>,
    private readonly cache: CacheService,
  ) {}

  // ─── Lecturas ─────────────────────────────────────────────────────────────

  async getMessages(userId: string): Promise<number> {
    return this.get(userId, 'messages');
  }

  async getNotifications(userId: string): Promise<number> {
    return this.get(userId, 'notifications');
  }

  async getBoth(userId: string): Promise<{ messages: number; notifications: number }> {
    const [messages, notifications] = await Promise.all([
      this.get(userId, 'messages'),
      this.get(userId, 'notifications'),
    ]);
    return { messages, notifications };
  }

  // ─── Incrementos (al crear mensaje/notificación) ──────────────────────────

  async incrementMessages(userId: string): Promise<number> {
    return this.increment(userId, 'messages');
  }

  async incrementNotifications(userId: string): Promise<number> {
    return this.increment(userId, 'notifications');
  }

  // ─── Decrementos (al leer) ────────────────────────────────────────────────

  async decrementMessages(userId: string, amount = 1): Promise<number> {
    return this.decrement(userId, 'messages', amount);
  }

  async decrementNotifications(userId: string, amount = 1): Promise<number> {
    return this.decrement(userId, 'notifications', amount);
  }

  // ─── Resets ───────────────────────────────────────────────────────────────

  async resetMessages(userId: string): Promise<void> {
    await this.reset(userId, 'messages');
  }

  async resetNotifications(userId: string): Promise<void> {
    await this.reset(userId, 'notifications');
  }

  /**
   * Recalcula contadores desde BD (usado por cron de consistencia o admin).
   */
  async recalculate(userId: string): Promise<{ messages: number; notifications: number }> {
    const [msgResult, ntfResult] = await Promise.all([
      this.counterRepo.manager.query(
        `SELECT COUNT(*) AS count FROM messages
         WHERE "recipientId" = $1 AND "isRead" = false AND "isDeleted" = false AND "isDraft" = false`,
        [userId],
      ),
      this.counterRepo.manager.query(
        // Bug #2 fix: excluir notificaciones de tipo 'message' del contador de campana
        `SELECT COUNT(*) AS count FROM notifications
         WHERE "userId" = $1 AND status = 'unread' AND type != 'message'`,
        [userId],
      ),
    ]);

    const messages = parseInt(msgResult[0]?.count ?? '0', 10);
    const notifications = parseInt(ntfResult[0]?.count ?? '0', 10);

    await Promise.all([
      this.persist(userId, 'messages', messages),
      this.persist(userId, 'notifications', notifications),
    ]);

    return { messages, notifications };
  }

  // ─── Implementación interna ───────────────────────────────────────────────

  private async get(userId: string, type: UnreadCounterType): Promise<number> {
    const key = redisKey(userId, type);

    // 1. Redis primero
    const cached = await this.cache.get<number>(key, { serializer: 'string' });
    if (cached !== null) {
      const n = parseInt(cached as unknown as string, 10);
      return isNaN(n) ? 0 : n;
    }

    // 2. Cache miss → BD
    const row = await this.counterRepo.findOne({ where: { userId, type } });
    const count = row?.count ?? 0;

    // Warm Redis
    await this.cache.set(key, count.toString(), { ttl: TTL_SECONDS, serializer: 'string' });

    return count;
  }

  private async increment(userId: string, type: UnreadCounterType): Promise<number> {
    // Redis INCR atómico
    const newCount = await this.cache.increment(redisKey(userId, type), 1, { ttl: TTL_SECONDS });

    // Persistir en BD de forma asíncrona (no bloquea la respuesta al cliente)
    this.persistAsync(userId, type, newCount);

    return newCount;
  }

  private async decrement(userId: string, type: UnreadCounterType, amount: number): Promise<number> {
    const key = redisKey(userId, type);

    // Asegurarse de que el contador Redis existe antes de decrementar
    await this.get(userId, type);

    // Decremento atómico con suelo en 0 (evita zombies por decrementos concurrentes)
    const next = await this.cache.decrementFloor(key, amount, { ttl: TTL_SECONDS });

    this.persistAsync(userId, type, next);

    return next;
  }

  private async reset(userId: string, type: UnreadCounterType): Promise<void> {
    const key = redisKey(userId, type);
    await this.cache.set(key, '0', { ttl: TTL_SECONDS, serializer: 'string' });
    this.persistAsync(userId, type, 0);
  }

  private async persist(userId: string, type: UnreadCounterType, count: number): Promise<void> {
    await this.counterRepo.upsert(
      { userId, type, count: Math.max(0, count) },
      ['userId', 'type'],
    );
    // Actualizar Redis también
    await this.cache.set(redisKey(userId, type), count.toString(), {
      ttl: TTL_SECONDS,
      serializer: 'string',
    });
  }

  private persistAsync(userId: string, type: UnreadCounterType, count: number): void {
    this.persist(userId, type, count).catch((err) =>
      this.logger.warn(`persistAsync failed for ${userId}:${type} → ${err.message}`),
    );
  }
}
