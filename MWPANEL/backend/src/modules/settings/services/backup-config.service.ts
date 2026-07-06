import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupConfig } from '../entities/backup-config.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface BackupConfigDto {
  enableAutoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionCount: number;
}

@Injectable()
export class BackupConfigService {
  private readonly logger = new Logger(BackupConfigService.name);

  constructor(
    @InjectRepository(BackupConfig)
    private readonly backupConfigRepository: Repository<BackupConfig>,
  ) {
    this.initializeDefaultConfig();
  }

  async initializeDefaultConfig(): Promise<void> {
    const existingConfig = await this.backupConfigRepository.findOne({
      where: { isActive: true }
    });

    if (!existingConfig) {
      const defaultConfig = this.backupConfigRepository.create({
        enableAutoBackup: true,
        backupFrequency: 'daily',
        backupTime: '02:00',
        retentionCount: 10,
        isActive: true
      });

      await this.backupConfigRepository.save(defaultConfig);
      this.logger.log('🔧 Default backup configuration created');
    }
  }

  async getConfig(): Promise<BackupConfig> {
    let config = await this.backupConfigRepository.findOne({
      where: { isActive: true }
    });

    if (!config) {
      await this.initializeDefaultConfig();
      config = await this.backupConfigRepository.findOne({
        where: { isActive: true }
      });
    }

    return config;
  }

  async updateConfig(configDto: BackupConfigDto): Promise<BackupConfig> {
    let config = await this.getConfig();

    // Update configuration
    config.enableAutoBackup = configDto.enableAutoBackup;
    config.backupFrequency = configDto.backupFrequency;
    config.backupTime = configDto.backupTime;
    config.retentionCount = configDto.retentionCount;

    // Calculate next backup time
    config.nextBackupTime = this.calculateNextBackupTime(
      configDto.backupFrequency,
      configDto.backupTime
    );

    const savedConfig = await this.backupConfigRepository.save(config);
    
    this.logger.log(`🔧 Backup configuration updated: ${configDto.backupFrequency} at ${configDto.backupTime}, keep ${configDto.retentionCount} backups`);
    
    return savedConfig;
  }

  private calculateNextBackupTime(frequency: string, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const nextBackup = new Date();

    nextBackup.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 1);
        }
        break;
      case 'weekly':
        nextBackup.setDate(nextBackup.getDate() + (7 - nextBackup.getDay()));
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 7);
        }
        break;
      case 'monthly':
        nextBackup.setMonth(nextBackup.getMonth() + 1, 1);
        if (nextBackup <= now) {
          nextBackup.setMonth(nextBackup.getMonth() + 1);
        }
        break;
    }

    return nextBackup;
  }

  async updateLastBackupTime(): Promise<void> {
    const config = await this.getConfig();
    config.lastBackupTime = new Date();
    config.nextBackupTime = this.calculateNextBackupTime(
      config.backupFrequency,
      config.backupTime
    );
    
    await this.backupConfigRepository.save(config);
    this.logger.log('📅 Last backup time updated');
  }

  async shouldRunBackup(): Promise<boolean> {
    const config = await this.getConfig();
    
    if (!config.enableAutoBackup) {
      return false;
    }

    const now = new Date();
    
    // If nextBackupTime is not set or is in the past, we should run backup
    if (!config.nextBackupTime || config.nextBackupTime <= now) {
      return true;
    }

    return false;
  }

  // This will be called by the scheduler service
  @Cron('0 * * * *') // Check every hour
  async checkScheduledBackup(): Promise<boolean> {
    const shouldRun = await this.shouldRunBackup();
    
    if (shouldRun) {
      this.logger.log('⏰ Scheduled backup should run now');
      return true;
    }

    return false;
  }
}