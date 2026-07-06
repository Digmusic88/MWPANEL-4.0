import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringSimpleController } from './monitoring-simple.controller';
import { SystemMonitorService } from './system-monitor.service';
import { AlertMonitorService } from './alert-monitor.service';
import { User } from '../users/entities/user.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Message } from '../communications/entities/message.entity';
// import { Task } from '../tasks/entities/task.entity';
// import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Activity,
      Message,
      // Task,
      // AttendanceRecord,
    ]),
  ],
  controllers: [MonitoringSimpleController],
  providers: [SystemMonitorService, AlertMonitorService],
  exports: [SystemMonitorService, AlertMonitorService],
})
export class MonitoringSimpleModule {}