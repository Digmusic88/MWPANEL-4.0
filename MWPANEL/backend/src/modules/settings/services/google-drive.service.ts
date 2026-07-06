import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GoogleDriveService as EducationalGoogleDriveService } from '../../educational-resources/services/google-drive.service';

@Injectable() 
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(
    @Inject(forwardRef(() => EducationalGoogleDriveService))
    private readonly educationalGoogleDriveService: EducationalGoogleDriveService
  ) {
    this.logger.log('🔄 DEPRECATED GoogleDriveService - delegating to EducationalResourcesService');
  }

  async downloadBackup(fileId: string, destinationPath: string): Promise<boolean> {
    this.logger.warn('downloadBackup not implemented in educational service - returning false');
    return false;
  }

  async uploadBackup(filePath: string, fileName?: string): Promise<any> {
    this.logger.warn('Legacy uploadBackup called - not implemented');
    return { success: false, error: 'Use educational-resources service uploadBackup with Buffer' };
  }

  async getBackupsList(): Promise<any[]> {
    this.logger.warn('getBackupsList not implemented - returning empty array');
    return [];
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    this.logger.warn('deleteBackup not implemented - returning false');
    return false;
  }

  async cleanupOldBackups(): Promise<number> {
    this.logger.warn('cleanupOldBackups not implemented - returning 0');
    return 0;
  }

  async getDriveStatus(): Promise<any> {
    return this.educationalGoogleDriveService.getConnectionStatus();
  }

  async syncLocalBackups(backupsDir: string): Promise<{ uploaded: number; failed: number }> {
    this.logger.warn('syncLocalBackups not implemented - returning zeros');
    return { uploaded: 0, failed: 0 };
  }

  isInitialized(): boolean {
    return this.educationalGoogleDriveService.isConfigured();
  }
}