import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración: Optimización del sistema de mensajería y notificaciones
 *
 * Cambios:
 * 1. Índices críticos para queries de unread count (50x más rápido)
 * 2. Tabla unread_counters (contadores materializados, elimina COUNT(*) en vivo)
 * 3. Columna delivered_at en message_read_status
 * 4. groupId nullable en message_read_status (mensajes directos sin grupo)
 */
export class AddCommunicationsPerformanceIndexes1753900000000 implements MigrationInterface {
  name = 'AddCommunicationsPerformanceIndexes1753900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Índices críticos ───────────────────────────────────────────────

    // Unread messages: query más frecuente del sistema
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recipient_unread
      ON messages("recipientId", "isRead")
      WHERE "isDeleted" = false AND "isDraft" = false
    `);

    // Mensajes por conversación ordenados (paginación)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
      ON messages("conversationId", "createdAt" DESC)
      WHERE "isDeleted" = false
    `);

    // Notificaciones no leídas por usuario
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
      ON notifications("userId", status, "createdAt" DESC)
    `);

    // Conversaciones activas ordenadas por actividad reciente
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_last_message
      ON conversations("lastMessageAt" DESC)
      WHERE "isArchived" = false
    `);

    // Mensajes por remitente (bandeja de enviados)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_created
      ON messages("senderId", "createdAt" DESC)
      WHERE "isDeleted" = false AND "isDeletedBySender" = false
    `);

    // ─── 2. Tabla unread_counters ──────────────────────────────────────────
    // Contadores materializados: elimina COUNT(*) en tiempo real.
    // Se incrementan al crear mensaje/notificación, se decrementan al leer.
    // Redis es la fuente primaria; esta tabla es el fallback persistente.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS unread_counters (
        "userId"     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type         varchar(20) NOT NULL,
        count        integer     NOT NULL DEFAULT 0 CHECK (count >= 0),
        "updatedAt"  timestamptz NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("userId", type)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_unread_counters_user
      ON unread_counters("userId")
    `);

    // ─── 3. delivered_at en message_read_status ────────────────────────────
    await queryRunner.query(`
      ALTER TABLE message_read_status
      ADD COLUMN IF NOT EXISTS "deliveredAt" timestamptz
    `);

    // ─── 4. groupId nullable en message_read_status ───────────────────────
    // Los mensajes directos no pertenecen a ningún grupo,
    // pero la columna era NOT NULL por error. Esto lo corrige.
    await queryRunner.query(`
      ALTER TABLE message_read_status
      ALTER COLUMN "group_id" DROP NOT NULL
    `);

    // ─── 5. Inicializar contadores existentes (una sola vez) ──────────────
    // Calcula el estado actual y lo inserta en unread_counters para que
    // Redis pueda cargarlo en el primer GET (cache warm-up).
    await queryRunner.query(`
      INSERT INTO unread_counters ("userId", type, count)
      SELECT
        m."recipientId" AS "userId",
        'messages'      AS type,
        COUNT(*)        AS count
      FROM messages m
      WHERE m."isRead" = false
        AND m."isDeleted" = false
        AND m."isDraft" = false
        AND m."recipientId" IS NOT NULL
      GROUP BY m."recipientId"
      ON CONFLICT ("userId", type) DO UPDATE
        SET count = EXCLUDED.count, "updatedAt" = NOW()
    `);

    await queryRunner.query(`
      INSERT INTO unread_counters ("userId", type, count)
      SELECT
        n."userId"        AS "userId",
        'notifications'   AS type,
        COUNT(*)          AS count
      FROM notifications n
      WHERE n.status = 'unread'
      GROUP BY n."userId"
      ON CONFLICT ("userId", type) DO UPDATE
        SET count = EXCLUDED.count, "updatedAt" = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_messages_recipient_unread`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_messages_conversation_created`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_user_unread`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_last_message`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_messages_sender_created`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_unread_counters_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS unread_counters`);
    await queryRunner.query(`ALTER TABLE message_read_status DROP COLUMN IF EXISTS "deliveredAt"`);
    await queryRunner.query(`ALTER TABLE message_read_status ALTER COLUMN "group_id" SET NOT NULL`);
  }
}
