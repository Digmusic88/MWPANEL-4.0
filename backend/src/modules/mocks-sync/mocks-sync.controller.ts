import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { SyncService } from './sync.service';

@Controller('secretaria/mocks-sync')
@UseGuards(SecretariaAuthGuard)
export class MocksSyncController {
  constructor(
    @InjectDataSource() private ds: DataSource,
    private readonly sync: SyncService,
  ) {}

  @Post('reconcile')
  @Roles('secretaria_admin')
  async reconcileNow() {
    return this.sync.reconcile('manual');
  }

  @Get('status')
  @Roles('secretaria_admin', 'direccion')
  async status() {
    const rows = await this.ds.query(
      `SELECT id, ran_at, trigger, ok, created, renamed, enrolled, unenrolled, adopted,
              incidencias, error, duration_ms
       FROM secretaria.mock_sync_log ORDER BY ran_at DESC LIMIT 20`,
    );
    return { rows };
  }
}
