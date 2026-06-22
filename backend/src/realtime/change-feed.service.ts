// backend/src/realtime/change-feed.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from 'pg';
import { RealtimeGateway } from './realtime.gateway';
import { topicForTable } from './realtime.topics';

@Injectable()
export class ChangeFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('ChangeFeed');
  private client: Client | null = null;
  private stopped = false;

  constructor(private gateway: RealtimeGateway) {}

  async onModuleInit() { await this.connect(); }
  async onModuleDestroy() { this.stopped = true; await this.client?.end().catch(() => {}); }

  private async connect() {
    if (this.stopped) return;
    this.client = new Client({
      host: process.env.DB_HOST || 'mw-panel-db-prod',
      port: parseInt(process.env.DB_PORT || '5432'),
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
    } catch (e: any) {
      this.log.error(`No se pudo conectar LISTEN: ${e.message}`);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.stopped) return;
    this.client?.removeAllListeners();
    this.client = null;
    setTimeout(() => this.connect(), 3000);
  }
}
