import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringRealtimeController } from './monitoring-realtime.controller';
import { AdvancedMonitoringController } from './advanced-monitoring.controller';
import { AdvancedMonitoringService } from './advanced-monitoring.service';
import { User } from '../users/entities/user.entity';
// import { AuditModule } from '../audit/audit.module'; // DISABLED - Audit system removed
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // AuditModule, // DISABLED - Audit system removed
    CacheModule,
  ],
  controllers: [
    MonitoringRealtimeController,
    AdvancedMonitoringController,
  ],
  providers: [
    AdvancedMonitoringService,
  ],
  exports: [
    AdvancedMonitoringService,
  ],
})
export class MonitoringRealtimeModule {}