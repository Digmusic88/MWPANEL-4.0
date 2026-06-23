import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Client } from 'pg';
import { SyncService } from './sync.service';

const SYNC_TABLES = new Set(['students', 'enrollments', 'groups']);

@Injectable()
export class SyncTriggersService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('MocksSyncTriggers');
  private client?: Client;
  private debounce?: NodeJS.Timeout;
  private stopped = false;

  constructor(private readonly sync: SyncService) {}

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.debounce) clearTimeout(this.debounce);
    this.client?.end().catch(() => {});
  }

  private async connect() {
    if (this.stopped) return;
    this.client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    this.client.on('notification', (msg) => {
      try {
        const { t } = JSON.parse(msg.payload || '{}');
        if (SYNC_TABLES.has(t)) this.schedule();
      } catch { /* ignore */ }
    });
    this.client.on('error', (e) => {
      this.log.warn(`pg listen error: ${e.message}; reconectando en 3s`);
      setTimeout(() => this.connect(), 3000);
    });
    try {
      await this.client.connect();
      await this.client.query('LISTEN secretaria_changes');
      this.log.log('escuchando secretaria_changes para sync con Mocks');
    } catch (e: any) {
      this.log.warn(`no se pudo conectar pg listen: ${e.message}; reintento en 3s`);
      setTimeout(() => this.connect(), 3000);
    }
  }

  /** Debounce ~5s: agrupa ráfagas de cambios en una sola reconciliación. */
  private schedule() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.sync.reconcile('change-feed').catch((e) => this.log.error(`sync change-feed: ${e.message}`));
    }, 5000);
  }

  /** Reconciliación completa diaria (red de seguridad). */
  @Cron('0 3 * * *')
  async daily() {
    this.log.log('reconciliación diaria 03:00');
    await this.sync.reconcile('cron').catch((e) => this.log.error(`sync cron: ${e.message}`));
  }
}
