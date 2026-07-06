import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Comprehensive health check' })
  check() {
    return this.health.check([
      // Database health
      () => this.db.pingCheck('database'),
      
      // Memory health (300MB heap threshold)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // Memory RSS (1GB threshold)
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
      
      // Disk health (90% threshold)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Simple status check' })
  status() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }
}