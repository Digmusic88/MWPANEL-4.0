import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupConfigService } from './backup-config.service';
import { LocalBackupService } from './local-backup.service';
import { TimeMachineBackupService } from './time-machine-backup.service';

@Injectable()
export class BackupSchedulerService {
  private readonly logger = new Logger(BackupSchedulerService.name);

  constructor(
    private readonly backupConfigService: BackupConfigService,
    private readonly localBackupService: LocalBackupService,
    private readonly timeMachineService: TimeMachineBackupService,
  ) {}

  // Check every hour if a backup should be executed
  @Cron('0 * * * *') // Every hour at minute 0
  async checkAndExecuteScheduledBackup(): Promise<void> {
    try {
      const shouldRunBackup = await this.backupConfigService.shouldRunBackup();
      
      if (shouldRunBackup) {
        this.logger.log('⏰ Scheduled backup triggered - executing automatic backup');
        
        // Execute the backup using the service
        const result = await this.localBackupService.createBackup();

        this.logger.log(`✅ Scheduled backup completed: ${result.filename} (${result.size})`);

        // Advance lastBackupTime/nextBackupTime so this doesn't re-trigger every hour
        await this.backupConfigService.updateLastBackupTime();
      } else {
        const config = await this.backupConfigService.getConfig();
        const nextBackup = config.nextBackupTime ? 
          config.nextBackupTime.toLocaleString() : 'No programado';
        
        this.logger.debug(`⏰ No backup needed. Next scheduled: ${nextBackup}`);
      }
    } catch (error) {
      this.logger.error('❌ Error during scheduled backup execution:', error);
    }
  }

  // Manual trigger method for testing or administrative use
  async triggerManualScheduledBackup(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('🔧 Manual scheduled backup triggered');
      
      const result = await this.localBackupService.createBackup();
      
      return {
        success: true,
        message: `Manual backup completed successfully: ${result.filename} (${result.size})`
      };
    } catch (error) {
      this.logger.error('❌ Error during manual scheduled backup:', error);
      return {
        success: false,
        message: `Error during manual backup: ${error.message}`
      };
    }
  }

  // TIME MACHINE CRON JOBS
  
  // Every hour at minute 0 - Time Machine Hourly Backup
  @Cron('0 * * * *') // Every hour
  async createTimeMachineHourlyBackup(): Promise<void> {
    try {
      this.logger.log('⏰ Starting Time Machine HOURLY backup...');
      const result = await this.timeMachineService.createHourlyBackup();
      this.logger.log(`✅ Time Machine HOURLY backup completed: ${result.filename} (${result.size})`);
    } catch (error) {
      this.logger.error(`❌ Error during Time Machine hourly backup: ${error.message}`);
    }
  }

  // Every day at 2:00 AM - Time Machine Daily Backup
  @Cron('0 2 * * *') // Daily at 2:00 AM
  async createTimeMachineDailyBackup(): Promise<void> {
    try {
      this.logger.log('⏰ Starting Time Machine DAILY backup...');
      const result = await this.timeMachineService.createDailyBackup();
      this.logger.log(`✅ Time Machine DAILY backup completed: ${result.filename} (${result.size})`);
    } catch (error) {
      this.logger.error(`❌ Error during Time Machine daily backup: ${error.message}`);
    }
  }

  // Every Sunday at 3:00 AM - Time Machine Weekly Backup
  @Cron('0 3 * * 0') // Weekly on Sunday at 3:00 AM
  async createTimeMachineWeeklyBackup(): Promise<void> {
    try {
      this.logger.log('⏰ Starting Time Machine WEEKLY backup...');
      const result = await this.timeMachineService.createWeeklyBackup();
      this.logger.log(`✅ Time Machine WEEKLY backup completed: ${result.filename} (${result.size})`);
    } catch (error) {
      this.logger.error(`❌ Error during Time Machine weekly backup: ${error.message}`);
    }
  }

  // Every 1st day of month at 4:00 AM - Time Machine Monthly Backup
  @Cron('0 4 1 * *') // Monthly on 1st day at 4:00 AM
  async createTimeMachineMonthlyBackup(): Promise<void> {
    try {
      this.logger.log('⏰ Starting Time Machine MONTHLY backup...');
      const result = await this.timeMachineService.createMonthlyBackup();
      this.logger.log(`✅ Time Machine MONTHLY backup completed: ${result.filename} (${result.size})`);
    } catch (error) {
      this.logger.error(`❌ Error during Time Machine monthly backup: ${error.message}`);
    }
  }

  // Manual Time Machine backup trigger
  async triggerTimeMachineBackup(type: 'hourly' | 'daily' | 'weekly' | 'monthly'): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔧 Manual Time Machine ${type.toUpperCase()} backup triggered`);
      
      let result;
      switch (type) {
        case 'hourly':
          result = await this.timeMachineService.createHourlyBackup();
          break;
        case 'daily':
          result = await this.timeMachineService.createDailyBackup();
          break;
        case 'weekly':
          result = await this.timeMachineService.createWeeklyBackup();
          break;
        case 'monthly':
          result = await this.timeMachineService.createMonthlyBackup();
          break;
      }
      
      return {
        success: true,
        message: `Time Machine ${type} backup completed: ${result.filename} (${result.size})`
      };
    } catch (error) {
      this.logger.error(`❌ Error during manual Time Machine ${type} backup: ${error.message}`);
      return {
        success: false,
        message: `Error during Time Machine ${type} backup: ${error.message}`
      };
    }
  }

  // Get Time Machine status
  async getTimeMachineStatus(): Promise<{
    hourly: { count: number; latest: string; size: string };
    daily: { count: number; latest: string; size: string };
    weekly: { count: number; latest: string; size: string };
    monthly: { count: number; latest: string; size: string };
    totalSize: string;
  }> {
    return await this.timeMachineService.getBackupStatusLegacy();
  }

  // Get status of the scheduler
  async getSchedulerStatus(): Promise<{
    enabled: boolean;
    nextBackupTime: Date | null;
    lastBackupTime: Date | null;
    frequency: string;
    retentionCount: number;
    timeMachine: {
      hourly: { count: number; latest: string; size: string };
      daily: { count: number; latest: string; size: string };
      weekly: { count: number; latest: string; size: string };
      monthly: { count: number; latest: string; size: string };
      totalSize: string;
    };
  }> {
    const config = await this.backupConfigService.getConfig();
    const timeMachineStatus = await this.getTimeMachineStatus();
    
    return {
      enabled: config.enableAutoBackup,
      nextBackupTime: config.nextBackupTime,
      lastBackupTime: config.lastBackupTime,
      frequency: config.backupFrequency,
      retentionCount: config.retentionCount,
      timeMachine: timeMachineStatus
    };
  }
}