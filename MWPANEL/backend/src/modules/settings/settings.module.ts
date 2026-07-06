import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsController } from './settings.controller';
import { LocalBackupController } from './local-backup.controller';
// import { RestoreController } from './controllers/restore.controller';
// import { SandboxController } from './controllers/sandbox.controller';
import { PdfManagerController } from './controllers/pdf-manager.controller';
import { NightlyRestartController } from './controllers/nightly-restart.controller';
import { TimeMachineController } from './controllers/time-machine.controller';
import { TimezoneController } from './controllers/timezone.controller';
// import { RateLimitController } from './controllers/rate-limit.controller';
// import { MonitoringController } from './controllers/monitoring.controller';
import { SettingsService } from './settings.service';
import { ClosureService } from './closure/closure.service';
// import { EducationalResourcesModule } from '../educational-resources/educational-resources.module';
// Removed BackupService - using GoogleDriveService from educational-resources
// import { RestoreService } from './services/restore.service';
// import { SandboxService } from './services/sandbox.service';
import { PdfManagerService } from './services/pdf-manager.service';
import { NightlyRestartService } from './services/nightly-restart.service';
import { TimeMachineBackupService } from './services/time-machine-backup.service';
import { TimezoneService } from './services/timezone.service';
import { RestoreProgressGateway } from './gateways/restore-progress.gateway';
import { BackupConfigService } from './services/backup-config.service';
import { BackupSchedulerService } from './services/backup-scheduler.service';
import { LocalBackupService } from './services/local-backup.service';
import { SystemSetting } from './entities/system-setting.entity';
import { BackupRecord } from './entities/backup-record.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { TimezoneSetting } from './entities/timezone-setting.entity';
import { User } from '../users/entities/user.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Message } from '../communications/entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting, BackupRecord, BackupConfig, TimezoneSetting, User, Activity, Message]),
    ScheduleModule.forRoot(),
    // EducationalResourcesModule // TEMPORARILY DISABLED to test backup issue
  ],
  controllers: [LocalBackupController, SettingsController, PdfManagerController, NightlyRestartController, TimeMachineController, TimezoneController],
  providers: [
    SettingsService,
    ClosureService,
    BackupConfigService,
    LocalBackupService,
    BackupSchedulerService,
    PdfManagerService, 
    NightlyRestartService, 
    TimeMachineBackupService,
    TimezoneService,
    RestoreProgressGateway
  ],
  exports: [SettingsService, ClosureService, BackupConfigService, PdfManagerService, NightlyRestartService, TimezoneService],
})
export class SettingsModule {}