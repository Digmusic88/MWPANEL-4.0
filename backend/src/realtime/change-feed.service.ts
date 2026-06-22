// backend/src/realtime/change-feed.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from 'pg';
import { RealtimeGateway } from './realtime.gateway';
import { topicForTable, topicsWithoutTrigger } from './realtime.topics';

@Injectable()
export class ChangeFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('ChangeFeed');
  private client: Client | null = null;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private gateway: RealtimeGateway) {}

  async onModuleInit() { await this.connect(); }
  async onModuleDestroy() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.client?.end().catch(() => {});
  }

  private async connect() {
    if (this.stopped) return;
    this.client = new Client({
      host: process.env.DB_HOST || 'mw-panel-db-prod',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'mwpanel',
      password: process.env.DB_PASS,
      database: process.env.DB_NAME || 'mwpanel',
    });
    this.client.on('notification', (msg) => {
      try {
        const { t, a } = JSON.parse(msg.payload || '{}');
        const topic = topicForTable(t);
        if (topic) this.gateway.broadcastChange(topic, a);
      } catch (e) { this.log.warn(`payload invalido: ${msg.payload}`); }
    });
    this.client.on('error', (e) => { this.log.error(`pg LISTEN error: ${e.message}`); this.reconnect(); });
    try {
      await this.client.connect();
      await this.client.query('LISTEN secretaria_changes');
      this.log.log('Escuchando secretaria_changes');
      // One-time startup check: warn if any mapped topic has no pg_notify trigger
      try {
        const rows = await this.client.query(
          `SELECT DISTINCT c.relname AS t
             FROM pg_trigger tg
             JOIN pg_class c ON c.oid = tg.tgrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             JOIN pg_proc p ON p.oid = tg.tgfoid
            WHERE n.nspname = 'secretaria'
              AND p.proname IN ('fn_audit','fn_notify_change')
              AND NOT tg.tgisinternal`);
        const triggered = rows.rows.map((r: any) => r.t);
        const missing = topicsWithoutTrigger(triggered);
        if (missing.length) {
          this.log.warn(
            `Topics de tiempo real SIN trigger NOTIFY (no refrescaran en vivo): ${missing.join(', ')}. Anade fn_audit o fn_notify_change a sus tablas.`,
          );
        }
      } catch (e: any) {
        this.log.warn(`No se pudo verificar drift topic/trigger: ${e.message}`);
      }
    } catch (e: any) {
      this.log.error(`No se pudo conectar LISTEN: ${e.message}`);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.stopped) return;
    const old = this.client;
    this.client = null;
    old?.removeAllListeners();
    old?.end().catch(() => {});
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
}
